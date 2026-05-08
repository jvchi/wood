import { MODEL_ASSETS, preloadModel } from './threeAssetStrategy'

const CHUNK_RELOAD_STORAGE_KEY = 'wood:chunk-reload-attempted'

function isChunkLoadError(error) {
  const message = String(error?.message || error || '')
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Loading chunk') ||
    message.includes('ChunkLoadError')
  )
}

function recoverFromChunkLoadError(error) {
  if (typeof window === 'undefined' || !isChunkLoadError(error)) {
    throw error
  }

  const storageKey = `${CHUNK_RELOAD_STORAGE_KEY}:${window.location.pathname}`
  if (window.sessionStorage.getItem(storageKey) === '1') {
    throw error
  }

  window.sessionStorage.setItem(storageKey, '1')
  window.location.reload()
  return new Promise(() => {})
}

function lazyRoute(loader) {
  return () => loader()
    .then(module => {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(`${CHUNK_RELOAD_STORAGE_KEY}:${window.location.pathname}`)
      }

      return module
    })
    .catch(recoverFromChunkLoadError)
}

export const routeLoaders = {
  '/': lazyRoute(() => import('../pages/HomePage')),
  '/shop': lazyRoute(() => import('../pages/ShopPage')),
  '/about': lazyRoute(() => import('../pages/AboutPage')),
  '/cart': lazyRoute(() => import('../pages/CartPage')),
  '/wishlist': lazyRoute(() => import('../pages/WishlistPage')),
  '/product': lazyRoute(() => import('../pages/ProductPage')),
  '/admin': lazyRoute(() => import('../pages/admin/AdminLayout')),
  '/admin/index': lazyRoute(() => import('../pages/admin/AdminOverview')),
  '/admin/products': lazyRoute(() => import('../pages/admin/AdminProductsPage')),
  '/admin/taxonomy': lazyRoute(() => import('../pages/admin/AdminTaxonomyPage')),
  '/admin/placeholder': lazyRoute(() => import('../pages/admin/AdminPlaceholderPage')),
  '*': lazyRoute(() => import('../pages/NotFoundPage')),
}

const preloadedRoutes = new Set()
const preloadedAssets = new Set()

function preloadThreeRuntime() {
  if (preloadedAssets.has('three-runtime')) return
  preloadedAssets.add('three-runtime')

  Promise.all([
    import('three'),
    import('@react-three/fiber'),
    import('@react-three/drei'),
  ]).catch(() => undefined)
}

function preloadHomeModels() {
  if (preloadedAssets.has('home-models')) return
  preloadedAssets.add('home-models')

  preloadModel(MODEL_ASSETS.room, { timeout: 250 })
  preloadModel(MODEL_ASSETS.pipoChair, { timeout: 450 })
}

function preloadProductModels() {
  if (preloadedAssets.has('product-models')) return
  preloadedAssets.add('product-models')

  preloadModel(MODEL_ASSETS.couch, { timeout: 300 })
}

function preloadRouteAssets(key) {
  if (key === '/') {
    preloadThreeRuntime()
    preloadHomeModels()
    return
  }

  if (key === '/product') {
    preloadThreeRuntime()
    preloadProductModels()
  }
}

export function preloadAppRoute(path) {
  const key = path.startsWith('/product/') ? '/product' : path
  const loader = routeLoaders[key]
  preloadRouteAssets(key)
  if (!loader || preloadedRoutes.has(key)) return
  preloadedRoutes.add(key)
  loader().catch(() => undefined)
}

export function preloadRouteForPath(path) {
  const key = path.startsWith('/product/') ? '/product' : path
  preloadRouteAssets(key)
  return routeLoaders[key]?.()
}
