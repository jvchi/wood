import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const THUMB_WIDTH = 180
const THUMB_QUALITY = 58
const THUMB_PADDING = Math.round(THUMB_WIDTH * 0.08)

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

function thumbPathForImage(row) {
  const sourcePath = storagePathFromPublicUrl(row.url, 'product-images')
  const parsed = path.parse(sourcePath || `${row.id}.image`)
  const safeBase = parsed.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  return `thumbs/${row.product_id}/${row.sort_order ?? 0}-${safeBase}-${row.id}.webp`
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
    .select('id,product_id,url,thumbnail_url,sort_order,alt_text')
    .order('product_id')
    .order('sort_order')
  if (productId) query = query.eq('product_id', productId)
  const { data: rows, error } = await query

  if (error) throw error

  const pending = rows.filter(row => row.url)
  console.log(`Found ${rows.length} product image rows; regenerating ${pending.length} thumbnails.`)

  let completed = 0
  for (const row of pending) {
    const thumbPath = thumbPathForImage(row)
    process.stdout.write(`(${completed + 1}/${pending.length}) ${row.id} -> ${thumbPath} ... `)

    try {
      const original = await downloadBytes(row.url)
      const metadata = await sharp(original, { animated: false })
        .rotate()
        .metadata()

      const availableWidth = THUMB_WIDTH - THUMB_PADDING * 2
      const availableHeight = THUMB_WIDTH - THUMB_PADDING * 2
      const scale = Math.min(
        availableWidth / (metadata.width || THUMB_WIDTH),
        availableHeight / (metadata.height || THUMB_WIDTH),
        1,
      )
      const resizedWidth = Math.max(1, Math.round((metadata.width || THUMB_WIDTH) * scale))
      const resizedHeight = Math.max(1, Math.round((metadata.height || THUMB_WIDTH) * scale))
      const left = Math.round((THUMB_WIDTH - resizedWidth) / 2)
      const top = Math.round((THUMB_WIDTH - resizedHeight) / 2)

      const product = await sharp(original, { animated: false })
        .rotate()
        .resize({
          width: resizedWidth,
          height: resizedHeight,
          fit: 'contain',
          withoutEnlargement: true,
        })
        .png()
        .toBuffer()

      const thumb = await sharp({
        create: {
          width: THUMB_WIDTH,
          height: THUMB_WIDTH,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: product, left, top }])
        .webp({ quality: THUMB_QUALITY, effort: 4 })
        .toBuffer()

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(thumbPath, thumb, {
          cacheControl: '31536000',
          contentType: 'image/webp',
          upsert: true,
        })
      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(thumbPath)
      const thumbnailUrl = publicData.publicUrl

      const { error: updateError } = await supabase
        .from('product_images')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', row.id)
      if (updateError) throw updateError

      const { error: trackError } = await supabase.from('product_uploads').insert({
        product_id: row.product_id,
        bucket_id: 'product-images',
        storage_path: thumbPath,
        public_url: thumbnailUrl,
        asset_kind: 'image_thumbnail',
        file_name: path.basename(thumbPath),
        content_type: 'image/webp',
        file_size: thumb.length,
        status: 'ready',
      })
      if (trackError) {
        console.warn(`tracked update failed: ${trackError.message}`)
      } else {
        console.log(`${thumb.length} bytes`)
      }
      completed += 1
    } catch (err) {
      console.log(`failed: ${err.message || err}`)
    }
  }

  console.log(`Backfilled ${completed}/${pending.length} thumbnails.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
