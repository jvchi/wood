import { MODEL_ASSETS, preloadModel } from './threeAssetStrategy'

export const routeLoaders = {
  '/': () => import('../pages/HomePage'),
  '/shop': () => import('../pages/ShopPage'),
  '/about': () => import('../pages/AboutPage'),
  '/cart': () => import('../pages/CartPage'),
  '/wishlist': () => import('../pages/WishlistPage'),
  '/product': () => import('../pages/ProductPage'),
  '/admin': () => import('../pages/admin/AdminLayout'),
  '/admin/index': () => import('../pages/admin/AdminOverview'),
  '/admin/products': () => import('../pages/admin/AdminProductsPage'),
  '/admin/taxonomy': () => import('../pages/admin/AdminTaxonomyPage'),
  '/admin/placeholder': () => import('../pages/admin/AdminPlaceholderPage'),
  '*': () => import('../pages/NotFoundPage'),
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
