// Supabase Edge Function: compress-model
//
// Reads a raw .glb/.gltf the admin panel uploaded to product-models/source/...,
// produces a Draco-compressed "full" variant and a simplified+Meshopt "lite"
// variant, writes both back to the bucket, and returns their public URLs.
//
// Texture transcoding (WebP/AVIF, resize) is intentionally not done here —
// `sharp` isn't easily available on Deno Edge. Geometry compression alone
// matches the bulk of the wins from `npm run model:optimize`.

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BUCKET = 'product-models'
const SKIP_COMPRESSION_MAX_BYTES = 5 * 1024 * 1024

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function loadDeps() {
  const stage: Record<string, string> = {}
  try {
    stage.step = 'core'
    const core = await import('https://esm.sh/@gltf-transform/core@3.10.1?target=denonext')
    stage.step = 'extensions'
    const extensions = await import('https://esm.sh/@gltf-transform/extensions@3.10.1?target=denonext')
    stage.step = 'functions'
    const fns = await import('https://esm.sh/@gltf-transform/functions@3.10.1?target=denonext&external=sharp')
    stage.step = 'meshoptimizer'
    const meshoptmod = await import('https://esm.sh/meshoptimizer@0.20.0?target=denonext')
    stage.step = 'draco3dgltf'
    const dracoMod = await import('https://esm.sh/draco3dgltf@1.5.7?target=denonext')
    stage.step = 'imagescript'
    const imagescript = await import('https://deno.land/x/imagescript@1.2.17/mod.ts')
    return { core, extensions, fns, meshoptmod, dracoMod, imagescript }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`dep-load failed at ${stage.step}: ${message}`)
  }
}

async function buildIO(deps: Awaited<ReturnType<typeof loadDeps>>) {
  const { core, extensions, meshoptmod, dracoMod } = deps
  const { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } = meshoptmod
  await MeshoptDecoder.ready
  await MeshoptEncoder.ready
  await MeshoptSimplifier.ready
  const draco3d = (dracoMod as { default?: unknown }).default ?? dracoMod
  // deno-lint-ignore no-explicit-any
  const d3d = draco3d as any
  const [decoderWasm, encoderWasm] = await Promise.all([
    fetch('https://unpkg.com/draco3dgltf@1.5.7/draco_decoder_gltf.wasm').then(r => r.arrayBuffer()),
    fetch('https://unpkg.com/draco3dgltf@1.5.7/draco_encoder.wasm').then(r => r.arrayBuffer()),
  ])
  return new core.WebIO()
    .registerExtensions(extensions.ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await d3d.createDecoderModule({ wasmBinary: new Uint8Array(decoderWasm) }),
      'draco3d.encoder': await d3d.createEncoderModule({ wasmBinary: new Uint8Array(encoderWasm) }),
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.encoder': MeshoptEncoder,
    })
}

// Skip pre-decode if the encoded image is too big — Edge Functions have a
// ~256MB memory ceiling and imagescript decodes to RGBA (4 bytes/pixel).
// A 3MB encoded JPEG can easily expand to 100MB+ RGBA.
const MAX_TEXTURE_DECODE_BYTES = 3 * 1024 * 1024

async function resizeTextures(doc: any, maxSize: number, imagescript: any, stats: TextureStats) {
  for (const tex of doc.getRoot().listTextures()) {
    const mime = tex.getMimeType()
    const buf = tex.getImage()
    if (!buf) { stats.missing++; continue }
    if (mime !== 'image/png' && mime !== 'image/jpeg') {
      stats.unsupportedMime++
      continue
    }
    if (buf.byteLength > MAX_TEXTURE_DECODE_BYTES) {
      stats.skippedTooLarge++
      continue
    }
    try {
      const decoded = await imagescript.decode(buf)
      const img = decoded?.constructor?.name === 'GIF' ? decoded.image : decoded
      if (!img) { stats.unsupportedMime++; continue }
      if (img.width <= maxSize && img.height <= maxSize) {
        stats.alreadySmall++
        continue
      }
      const scale = maxSize / Math.max(img.width, img.height)
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      img.resize(w, h)
      const out = mime === 'image/jpeg'
        ? await img.encodeJPEG(85)
        : await img.encode()
      tex.setImage(out instanceof Uint8Array ? out : new Uint8Array(out))
      stats.resized++
    } catch (e) {
      stats.errored++
      console.warn('texture resize skipped:', tex.getName?.(), (e as Error)?.message)
    }
  }
}

interface TextureStats {
  resized: number
  alreadySmall: number
  skippedTooLarge: number
  unsupportedMime: number
  missing: number
  errored: number
}

function newTextureStats(): TextureStats {
  return { resized: 0, alreadySmall: 0, skippedTooLarge: 0, unsupportedMime: 0, missing: 0, errored: 0 }
}

async function compressFull(io: any, fns: any, imagescript: any, bytes: Uint8Array) {
  const stats = newTextureStats()
  const doc = await io.readBinary(bytes)
  await doc.transform(fns.dedup(), fns.prune(), fns.weld())
  await resizeTextures(doc, 2048, imagescript, stats)
  await doc.transform(fns.draco({ method: 'edgebreaker' }))
  const out = await io.writeBinary(doc)
  return { bytes: out, stats }
}

async function compressLite(io: any, fns: any, simplifier: any, encoder: any, imagescript: any, bytes: Uint8Array) {
  const stats = newTextureStats()
  const doc = await io.readBinary(bytes)
  await doc.transform(
    fns.dedup(),
    fns.prune(),
    fns.weld(),
    fns.simplify({ simplifier, ratio: 0.75, error: 0.001, lockBorder: true }),
  )
  await resizeTextures(doc, 1024, imagescript, stats)
  await doc.transform(fns.meshopt({ encoder, level: 'medium' }))
  const out = await io.writeBinary(doc)
  return { bytes: out, stats }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  try {
    const { sourcePath, productId, sourceFileName, sourceContentType, force } = await req.json()
    if (!sourcePath || typeof sourcePath !== 'string') {
      throw new Error('sourcePath is required')
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    const { data: source, error: dlErr } = await admin.storage.from(BUCKET).download(sourcePath)
    if (dlErr) throw dlErr
    const bytes = new Uint8Array(await source.arrayBuffer())

    let fullBytes: Uint8Array
    let liteBytes: Uint8Array
    let skippedCompression = false
    let fullStats: TextureStats | null = null
    let liteStats: TextureStats | null = null
    let stage = 'init'
    if (!force && bytes.byteLength <= SKIP_COMPRESSION_MAX_BYTES) {
      fullBytes = bytes
      liteBytes = bytes
      skippedCompression = true
    } else {
      try {
        stage = 'load-deps'
        const deps = await loadDeps()
        stage = 'build-io'
        const io = await buildIO(deps)
        stage = 'compress-full'
        const full = await compressFull(io, deps.fns, deps.imagescript, bytes)
        fullBytes = full.bytes
        fullStats = full.stats
        stage = 'compress-lite'
        const lite = await compressLite(
          io,
          deps.fns,
          deps.meshoptmod.MeshoptSimplifier,
          deps.meshoptmod.MeshoptEncoder,
          deps.imagescript,
          bytes,
        )
        liteBytes = lite.bytes
        liteStats = lite.stats
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        throw new Error(`Compression failed at "${stage}": ${message}`)
      }
    }

    const stamp = Date.now()
    const dir = `compressed/${productId || 'draft'}/${stamp}`
    const fullPath = `${dir}/full.glb`
    const litePath = `${dir}/lite.glb`

    const fullUp = await admin.storage.from(BUCKET).upload(fullPath, fullBytes, {
      contentType: 'model/gltf-binary',
      upsert: true,
      cacheControl: '31536000',
    })
    if (fullUp.error) throw fullUp.error

    const liteUp = await admin.storage.from(BUCKET).upload(litePath, liteBytes, {
      contentType: 'model/gltf-binary',
      upsert: true,
      cacheControl: '31536000',
    })
    if (liteUp.error) throw liteUp.error

    const { data: fullPub } = admin.storage.from(BUCKET).getPublicUrl(fullPath)
    const { data: litePub } = admin.storage.from(BUCKET).getPublicUrl(litePath)
    const { data: srcPub } = admin.storage.from(BUCKET).getPublicUrl(sourcePath)

    const baseName = (sourceFileName as string | undefined) || sourcePath.split('/').pop() || 'model.glb'
    const trackedAt = new Date().toISOString()
    const rows = [
      {
        product_id: productId || null,
        bucket_id: BUCKET,
        storage_path: sourcePath,
        public_url: srcPub.publicUrl,
        asset_kind: 'source_model',
        file_name: baseName,
        content_type: sourceContentType || 'model/gltf-binary',
        file_size: bytes.byteLength,
        status: 'ready',
        created_at: trackedAt,
      },
      {
        product_id: productId || null,
        bucket_id: BUCKET,
        storage_path: fullPath,
        public_url: fullPub.publicUrl,
        asset_kind: 'full_model',
        file_name: 'full.glb',
        content_type: 'model/gltf-binary',
        file_size: fullBytes.byteLength,
        status: 'ready',
        created_at: trackedAt,
      },
      {
        product_id: productId || null,
        bucket_id: BUCKET,
        storage_path: litePath,
        public_url: litePub.publicUrl,
        asset_kind: 'lite_model',
        file_name: 'lite.glb',
        content_type: 'model/gltf-binary',
        file_size: liteBytes.byteLength,
        status: 'ready',
        created_at: trackedAt,
      },
    ]
    const { error: trackErr } = await admin.from('product_uploads').insert(rows)
    if (trackErr) console.warn('product_uploads insert failed:', trackErr.message)

    return new Response(
      JSON.stringify({
        fullUrl: fullPub.publicUrl,
        liteUrl: litePub.publicUrl,
        fullSize: fullBytes.byteLength,
        liteSize: liteBytes.byteLength,
        sourceSize: bytes.byteLength,
        version: String(stamp),
        skippedCompression,
        textureStats: { full: fullStats, lite: liteStats },
      }),
      { headers: { ...corsHeaders, 'content-type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
