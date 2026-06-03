import { WebIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import {
  TextureResizeFilter,
  dedup,
  meshopt,
  prune,
  quantize,
  reorder,
  resample,
  simplify,
  textureCompress,
  weld,
} from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'

export const CLIENT_MODEL_UPLOAD_TARGET_BYTES = 45 * 1024 * 1024

function optimizedName(file, suffix) {
  const base = file.name.replace(/\.(glb|gltf)$/i, '')
  return `${base || 'model'}-${suffix}.glb`
}

async function optimizePass(file, { aggressive = false, onProgress } = {}) {
  onProgress?.(aggressive ? 'Optimizing harder...' : 'Reading model...')
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready])

  const io = new WebIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.encoder': MeshoptEncoder,
    })

  const bytes = new Uint8Array(await file.arrayBuffer())
  const doc = await io.readBinary(bytes)

  onProgress?.('Cleaning geometry...')
  const transforms = [
    dedup(),
    prune(),
    resample(),
    weld({ tolerance: 0.0001 }),
  ]

  if (aggressive) {
    transforms.push(simplify({
      simplifier: MeshoptSimplifier,
      ratio: 0.82,
      error: 0.0008,
      lockBorder: true,
    }))
  }

  transforms.push(
    quantize({
      quantizePosition: aggressive ? 13 : 14,
      quantizeNormal: 10,
      quantizeTexcoord: 12,
      quantizeColor: 8,
      quantizeGeneric: 12,
    }),
    reorder({ encoder: MeshoptEncoder }),
  )

  await doc.transform(...transforms)

  onProgress?.('Compressing textures...')
  await doc.transform(textureCompress({
    targetFormat: 'webp',
    resize: aggressive ? [1024, 1024] : [2048, 2048],
    resizeFilter: TextureResizeFilter.LANCZOS3,
    quality: aggressive ? 72 : 84,
    effort: 75,
    limitInputPixels: false,
  }))

  onProgress?.('Compressing mesh data...')
  await doc.transform(meshopt({
    encoder: MeshoptEncoder,
    level: aggressive ? 'high' : 'medium',
    quantizePosition: aggressive ? 13 : 14,
    quantizeNormal: 10,
    quantizeTexcoord: 12,
    quantizeColor: 8,
    quantizeGeneric: 12,
  }))

  const out = await io.writeBinary(doc)
  return new File([out], optimizedName(file, aggressive ? 'optimized-lite' : 'optimized'), {
    type: 'model/gltf-binary',
  })
}

export async function optimizeModelForUpload(file, { onProgress } = {}) {
  if (!file) return null
  const firstPass = await optimizePass(file, { onProgress })
  if (firstPass.size <= CLIENT_MODEL_UPLOAD_TARGET_BYTES) return firstPass
  return optimizePass(file, { aggressive: true, onProgress })
}

export async function optimizeModelVariantsForUpload(file, { onProgress } = {}) {
  if (!file) return { full: null, lite: null }

  const fullFirstPass = await optimizePass(file, { onProgress })
  const full = fullFirstPass.size <= CLIENT_MODEL_UPLOAD_TARGET_BYTES
    ? fullFirstPass
    : await optimizePass(file, { aggressive: true, onProgress })

  onProgress?.('Creating lite model...')
  const lite = await optimizePass(file, {
    aggressive: true,
    onProgress: status => onProgress?.(`Lite · ${status}`),
  })

  return { full, lite }
}
