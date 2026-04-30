import { lazy, Suspense, useEffect, useState } from 'react'
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
import InitialLoadTransition from './components/layout/InitialLoadTransition'
import { PersistentThreeSceneProvider } from './components/three/PersistentThreeSceneProvider'
import useInitialLoadReady from './hooks/useInitialLoadReady'
import { routeLoaders } from './lib/routePreload'

const HomePage = lazy(routeLoaders['/'])
const ShopPage = lazy(routeLoaders['/shop'])
const ProductPage = lazy(routeLoaders['/product'])
const CartPage = lazy(routeLoaders['/cart'])
const WishlistPage = lazy(routeLoaders['/wishlist'])
const AboutPage = lazy(routeLoaders['/about'])
const NotFoundPage = lazy(routeLoaders['*'])
const AdminLayout = lazy(routeLoaders['/admin'])
const AdminOverview = lazy(routeLoaders['/admin/index'])
const AdminProductsPage = lazy(routeLoaders['/admin/products'])
const AdminTaxonomyPage = lazy(routeLoaders['/admin/taxonomy'])
const AdminPlaceholderPage = lazy(routeLoaders['/admin/placeholder'])

gsap.registerPlugin(ScrollTrigger)

const MotionDiv = framerMotion.div

function RouteFallback() {
  return <div className="route-fallback" role="status" aria-label="Loading page" />
}

function AppRoutes() {
  const location = useLocation()
  const [displayedLocation, setDisplayedLocation] = useState(location)
  const backgroundLocation = location.state?.backgroundLocation
  const activeProductId = location.state?.sharedProductId ? String(location.state.sharedProductId) : null
  const initialLoad = useInitialLoadReady(location.pathname)
  const [showInitialProgress, setShowInitialProgress] = useState(true)
  const routeIsPending = !backgroundLocation && displayedLocation.key !== location.key
  const routeCanReveal = initialLoad.ready && !routeIsPending
  const routeIsComplete = initialLoad.complete && !routeIsPending
  const visualLocation = backgroundLocation || displayedLocation

  return (
    <SharedProductTransitionContext.Provider value={{ activeProductId }}>
      <LayoutGroup id="product-shared-layout">
        <PageLayout brandIntroReady={routeCanReveal} visualLocation={visualLocation}>
          <Suspense fallback={<RouteFallback />}>
            <Routes location={visualLocation}>
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

        {!routeIsComplete && (
          <InitialLoadTransition
            ready={routeCanReveal}
            showProgress={showInitialProgress}
            variant={location.pathname === '/' ? 'home' : 'default'}
            onCoverEnterComplete={() => {
              setDisplayedLocation(location)
            }}
            onExitComplete={() => {
              setShowInitialProgress(false)
              initialLoad.setComplete(true)
            }}
          />
        )}
      </LayoutGroup>
    </SharedProductTransitionContext.Provider>
  )
}

export default function App() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    if (window.matchMedia('(pointer: coarse)').matches) return undefined

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
