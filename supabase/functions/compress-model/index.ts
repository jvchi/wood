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
    return { core, extensions, fns, meshoptmod, dracoMod }
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

async function compressFull(io: any, fns: any, bytes: Uint8Array) {
  const doc = await io.readBinary(bytes)
  await doc.transform(fns.dedup(), fns.prune(), fns.weld(), fns.draco({ method: 'edgebreaker' }))
  return await io.writeBinary(doc)
}

async function compressLite(io: any, fns: any, simplifier: any, encoder: any, bytes: Uint8Array) {
  const doc = await io.readBinary(bytes)
  await doc.transform(
    fns.dedup(),
    fns.prune(),
    fns.weld(),
    // Conservative simplification: keep 75% of triangles, tight error budget,
    // lock border edges so UV seams and material boundaries don't collapse.
    fns.simplify({ simplifier, ratio: 0.75, error: 0.001, lockBorder: true }),
    // 'medium' quantization preserves more precision than 'high'.
    fns.meshopt({ encoder, level: 'medium' }),
  )
  return await io.writeBinary(doc)
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
    const { sourcePath, productId, sourceFileName, sourceContentType } = await req.json()
    if (!sourcePath || typeof sourcePath !== 'string') {
      throw new Error('sourcePath is required')
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    const { data: source, error: dlErr } = await admin.storage.from(BUCKET).download(sourcePath)
    if (dlErr) throw dlErr
    const bytes = new Uint8Array(await source.arrayBuffer())

    const deps = await loadDeps()
    const io = await buildIO(deps)
    const fullBytes = await compressFull(io, deps.fns, bytes)
    const liteBytes = await compressLite(
      io,
      deps.fns,
      deps.meshoptmod.MeshoptSimplifier,
      deps.meshoptmod.MeshoptEncoder,
      bytes,
    )

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
