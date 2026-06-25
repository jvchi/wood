import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// Aspect-preserving thumbnail: scale so the longest side is THUMB_MAX_SIDE,
// keep the source aspect ratio. Tiny WebP (~3–8 KB) used as a sharp LQIP
// while the full image streams in.
const THUMB_MAX_SIDE = 240
const THUMB_QUALITY = 60
// Mid-size display variant: the actual image shown in cards / galleries when
// Supabase Image Transforms aren't enabled. ~80–150 KB WebP vs a multi-MB
// source PNG. Longest side capped at DISPLAY_MAX_SIDE, source aspect kept.
const DISPLAY_MAX_SIDE = 1280
const DISPLAY_QUALITY = 80

function loadEnvFile(filePath) {
  return readFile(filePath, 'utf8')
    .then(text => {
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
        if (!match) continue
        const [, key, rawValue] = match
        if (process.env[key]) continue
        process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
      }
    })
    .catch(() => {})
}

function storagePathFromPublicUrl(url, bucket) {
  if (!url || typeof url !== 'string') return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
}

function safeBaseForImage(row) {
  const sourcePath = storagePathFromPublicUrl(row.url, 'product-images')
  const parsed = path.parse(sourcePath || `${row.id}.image`)
  return parsed.name.replace(/[^a-zA-Z0-9._-]/g, '-')
}

function thumbPathForImage(row) {
  return `thumbs/${row.product_id}/${row.sort_order ?? 0}-${safeBaseForImage(row)}-${row.id}.webp`
}

function displayPathForImage(row) {
  return `displays/${row.product_id}/${row.sort_order ?? 0}-${safeBaseForImage(row)}-${row.id}.webp`
}

function variantDimensions(sourceWidth, sourceHeight, maxSide) {
  const scale = Math.min(maxSide / Math.max(sourceWidth, sourceHeight), 1)
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  }
}

async function downloadBytes(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`download failed ${response.status} ${response.statusText}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  await loadEnvFile('.env.local')
  const productId = process.argv[2] || ''

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  let query = supabase
    .from('product_images')
    .select('id,product_id,url,thumbnail_url,width,height,sort_order,alt_text')
    .order('product_id')
    .order('sort_order')
  if (productId) query = query.eq('product_id', productId)
  const { data: rows, error } = await query

  if (error) throw error

  const pending = rows.filter(row => row.url)
  console.log(`Found ${rows.length} product image rows; backfilling ${pending.length}.`)

  async function uploadVariant(storagePath, buffer, assetKind, productIdForRow) {
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(storagePath, buffer, {
        cacheControl: '31536000',
        contentType: 'image/webp',
        upsert: true,
      })
    if (uploadError) throw uploadError

    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(storagePath)
    const publicUrl = publicData.publicUrl

    const { error: trackError } = await supabase.from('product_uploads').insert({
      product_id: productIdForRow,
      bucket_id: 'product-images',
      storage_path: storagePath,
      public_url: publicUrl,
      asset_kind: assetKind,
      file_name: path.basename(storagePath),
      content_type: 'image/webp',
      file_size: buffer.length,
      status: 'ready',
    })
    if (trackError) console.warn(`tracked insert failed (${assetKind}): ${trackError.message}`)
    return publicUrl
  }

  let completed = 0
  for (const row of pending) {
    const thumbPath = thumbPathForImage(row)
    const displayPath = displayPathForImage(row)
    process.stdout.write(`(${completed + 1}/${pending.length}) ${row.id} ... `)

    try {
      const original = await downloadBytes(row.url)
      const metadata = await sharp(original, { animated: false })
        .rotate()
        .metadata()

      const sourceWidth = metadata.width || 0
      const sourceHeight = metadata.height || 0
      if (!sourceWidth || !sourceHeight) {
        throw new Error(`could not read dimensions (${row.url})`)
      }

      const thumbSize = variantDimensions(sourceWidth, sourceHeight, THUMB_MAX_SIDE)
      const thumb = await sharp(original, { animated: false })
        .rotate()
        .resize({ width: thumbSize.width, height: thumbSize.height, fit: 'contain', withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY, effort: 4 })
        .toBuffer()

      const displaySize = variantDimensions(sourceWidth, sourceHeight, DISPLAY_MAX_SIDE)
      const display = await sharp(original, { animated: false })
        .rotate()
        .resize({ width: displaySize.width, height: displaySize.height, fit: 'contain', withoutEnlargement: true })
        .webp({ quality: DISPLAY_QUALITY, effort: 4 })
        .toBuffer()

      const thumbnailUrl = await uploadVariant(thumbPath, thumb, 'image_thumbnail', row.product_id)
      const displayUrl = await uploadVariant(displayPath, display, 'image_display', row.product_id)

      const { error: updateError } = await supabase
        .from('product_images')
        .update({
          thumbnail_url: thumbnailUrl,
          display_url: displayUrl,
          width: sourceWidth,
          height: sourceHeight,
        })
        .eq('id', row.id)
      if (updateError) throw updateError

      console.log(`thumb ${thumb.length}B · display ${display.length}B · ${sourceWidth}×${sourceHeight}`)
      completed += 1
    } catch (err) {
      console.log(`failed: ${err.message || err}`)
    }
  }

  console.log(`Backfilled ${completed}/${pending.length} images (thumbnail + display).`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
