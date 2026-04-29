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

export function preloadAppRoute(path) {
  const key = path.startsWith('/product/') ? '/product' : path
  const loader = routeLoaders[key]
  if (!loader || preloadedRoutes.has(key)) return
  preloadedRoutes.add(key)
  loader()
}
