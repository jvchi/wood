export const MODEL_QUALITY = {
  full: 'full',
  lite: 'lite',
  poster: 'poster',
}

const ASSET_VERSION = '2026-04-29'

export const MODEL_ASSETS = {
  room: {
    id: 'room',
    src: '/models/optimized/room.full.glb',
    liteSrc: '/models/optimized/room.lite.glb',
    poster: '',
    version: ASSET_VERSION,
    budgetKb: 6000,
  },
  couch: {
    id: 'couch',
    src: '/models/optimized/couch.full.glb',
    liteSrc: '/models/optimized/couch.lite.glb',
    poster: '',
    version: ASSET_VERSION,
    budgetKb: 3000,
  },
  pipoChair: {
    id: 'pipo-chair',
    src: '/models/optimized/pipo_chair.full.glb',
    liteSrc: '/models/optimized/pipo_chair.lite.glb',
    poster: '',
    version: ASSET_VERSION,
    budgetKb: 2500,
  },
}

export const MODEL_OPTIMIZATION_REQUIREMENTS = {
  geometry: 'Draco or Meshopt compression before publishing',
  textures: 'Resize to display size, convert color maps to WebP or AVIF, keep normal/roughness maps lossless when needed',
  variants: 'Publish full, lite, and poster outputs for every admin-uploaded product model',
  cacheBust: 'Change file path or version query when model bytes change',
}

export function versionAssetUrl(url, version) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url
  if (!version) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${encodeURIComponent(version)}`
}

export function resolveModelAsset(assetOrUrl, options = {}) {
  const quality = options.quality || MODEL_QUALITY.full
  const asset = typeof assetOrUrl === 'string' ? { src: assetOrUrl } : assetOrUrl
  const src = quality === MODEL_QUALITY.lite ? asset.liteSrc || asset.src : asset.src

  return {
    ...asset,
    src: versionAssetUrl(src, asset.version || options.version),
    poster: asset.poster || options.poster || '',
  }
}

export function canUseWebGL() {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function getDevicePerformanceProfile() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { tier: 'high', preferStatic: false, preferLite: false, dpr: 1 }
  }

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches
  const narrow = window.matchMedia?.('(max-width: 767px)').matches
  const lowMemory = Number(navigator.deviceMemory || 8) <= 4
  const lowCores = Number(navigator.hardwareConcurrency || 8) <= 4
  const saveData = navigator.connection?.saveData === true
  const slowConnection = /(^2g$|^3g$|slow-2g)/i.test(navigator.connection?.effectiveType || '')
  const webgl = canUseWebGL()
  const deviceDpr = Math.min(window.devicePixelRatio || 1, 1.75)

  if (!webgl || reducedMotion || saveData || slowConnection) {
    return { tier: 'static', preferStatic: true, preferLite: true, dpr: 1 }
  }

  if (coarsePointer || narrow || lowMemory || lowCores) {
    return { tier: 'balanced', preferStatic: false, preferLite: true, dpr: Math.max(1.35, deviceDpr) }
  }

  return { tier: 'high', preferStatic: false, preferLite: false, dpr: Math.max(1.5, deviceDpr) }
}

export function runWhenIdle(callback, timeout = 1500) {
  if (typeof window === 'undefined') return undefined
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(callback, { timeout })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(callback, Math.min(timeout, 250))
  return () => window.clearTimeout(id)
}

export function preloadModel(assetOrUrl, options = {}) {
  const asset = resolveModelAsset(assetOrUrl, options)
  if (!asset.src || getDevicePerformanceProfile().preferStatic) return undefined
  return runWhenIdle(async () => {
    const { useGLTF } = await import('@react-three/drei')
    useGLTF.preload(asset.src)
  }, options.timeout)
}

export function disposeObject3D(object) {
  object?.traverse?.((child) => {
    if (child.geometry) child.geometry.dispose()
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.filter(Boolean).forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value?.isTexture) value.dispose()
      })
      material.dispose?.()
    })
  })
}
