import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import gsap from 'gsap'
import Lenis from 'lenis'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CartProvider } from './context/CartContext'
import { WishlistProvider } from './context/WishlistContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import PageLayout from './components/layout/PageLayout'
import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/CartPage'
import WishlistPage from './pages/WishlistPage'
import AboutPage from './pages/AboutPage'
import NotFoundPage from './pages/NotFoundPage'

gsap.registerPlugin(ScrollTrigger)

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
              <PageLayout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/product/:id" element={<ProductPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </PageLayout>
            </ToastProvider>
          </WishlistProvider>
        </CartProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
