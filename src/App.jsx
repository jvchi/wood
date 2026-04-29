import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion as framerMotion } from 'framer-motion'
import gsap from 'gsap'
import Lenis from 'lenis'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CartProvider } from './context/CartContext'
import { WishlistProvider } from './context/WishlistContext'
import { ToastProvider } from './context/ToastContext'
import { SharedProductTransitionContext } from './context/SharedProductTransitionContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import PageLayout from './components/layout/PageLayout'
import { PersistentThreeSceneProvider } from './components/three/PersistentThreeSceneProvider'

const HomePage = lazy(() => import('./pages/HomePage'))
const ShopPage = lazy(() => import('./pages/ShopPage'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const WishlistPage = lazy(() => import('./pages/WishlistPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'))
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage'))
const AdminTaxonomyPage = lazy(() => import('./pages/admin/AdminTaxonomyPage'))
const AdminPlaceholderPage = lazy(() => import('./pages/admin/AdminPlaceholderPage'))

gsap.registerPlugin(ScrollTrigger)

const MotionDiv = framerMotion.div

function RouteFallback() {
  return <div className="route-fallback" role="status" aria-label="Loading page" />
}

function AppRoutes() {
  const location = useLocation()
  const backgroundLocation = location.state?.backgroundLocation
  const activeProductId = location.state?.sharedProductId ? String(location.state.sharedProductId) : null

  return (
    <SharedProductTransitionContext.Provider value={{ activeProductId }}>
      <LayoutGroup id="product-shared-layout">
        <PageLayout>
          <Suspense fallback={<RouteFallback />}>
            <Routes location={backgroundLocation || location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="taxonomy" element={<AdminTaxonomyPage />} />
                <Route path="orders" element={<AdminPlaceholderPage type="orders" />} />
                <Route path="customers" element={<AdminPlaceholderPage type="customers" />} />
                <Route path="coupons" element={<AdminPlaceholderPage type="coupons" />} />
                <Route path="shipping" element={<AdminPlaceholderPage type="shipping" />} />
                <Route path="settings" element={<AdminPlaceholderPage type="settings" />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </PageLayout>

        <AnimatePresence initial={false}>
          {backgroundLocation && (
            <MotionDiv
              key={location.key}
              layoutRoot
              layoutScroll
              className="product-route-overlay"
              data-lenis-prevent
            >
              <Suspense fallback={null}>
                <Routes location={location}>
                  <Route path="/product/:id" element={<ProductPage isOverlay />} />
                </Routes>
              </Suspense>
            </MotionDiv>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </SharedProductTransitionContext.Provider>
  )
}

export default function App() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const lenis = new Lenis({
      autoRaf: true,
      duration: 1,
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 0.95,
    })

    lenis.on('scroll', ScrollTrigger.update)
    window.__lenis = lenis
    ScrollTrigger.refresh()

    return () => {
      lenis.off('scroll', ScrollTrigger.update)
      if (window.__lenis === lenis) {
        window.__lenis = undefined
      }
      lenis.destroy()
    }
  }, [])

  return (
    <ErrorBoundary fallback={<div style={{ padding: 40, fontFamily: 'sans-serif' }}>Something went wrong. Check the browser console for details.</div>}>
      <BrowserRouter>
        <CartProvider>
          <WishlistProvider>
            <ToastProvider>
              <PersistentThreeSceneProvider>
                <AppRoutes />
              </PersistentThreeSceneProvider>
            </ToastProvider>
          </WishlistProvider>
        </CartProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
