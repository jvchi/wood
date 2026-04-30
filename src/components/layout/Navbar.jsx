import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion as framerMotion } from 'framer-motion'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import { preloadAppRoute } from '../../lib/routePreload'
import MobileNav from './MobileNav'

const MotionSpan = framerMotion.span
const brandLayoutTransition = {
  layout: {
    type: 'spring',
    stiffness: 560,
    damping: 42,
    mass: 0.82,
  },
}

export default function Navbar({ brandIntroReady = true, visualLocation }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navHidden, setNavHidden] = useState(false)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)
  const { totalItems } = useCart()
  const { items: wishlistItems } = useWishlist()
  const location = useLocation()
  const displayedLocation = visualLocation || location
  const hasWishlistItems = wishlistItems.length > 0
  const isHome = displayedLocation.pathname === '/'

  const navLinks = [
    { to: '/', label: 'New' },
    { to: '/shop', label: 'Shop' },
    { to: '/about', label: 'About' },
  ]

  function getPreloadProps(to) {
    return {
      onPointerEnter: () => preloadAppRoute(to),
      onFocus: () => preloadAppRoute(to),
      onTouchStart: () => preloadAppRoute(to),
    }
  }

  useEffect(() => {
    lastScrollY.current = window.scrollY
    let hidden = false

    function updateNav() {
      const currentY = window.scrollY
      const delta = currentY - lastScrollY.current
      const pastThreshold = currentY > 96

      if (Math.abs(delta) < 8) {
        ticking.current = false
        return
      }

      hidden = delta > 0 && pastThreshold && !mobileOpen
      setNavHidden(hidden)
      document.documentElement.classList.toggle('nav-is-hidden', hidden)
      lastScrollY.current = Math.max(currentY, 0)
      ticking.current = false
    }

    function onScroll() {
      if (!ticking.current) {
        window.requestAnimationFrame(updateNav)
        ticking.current = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.documentElement.classList.remove('nav-is-hidden')
    }
  }, [mobileOpen])

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold">
        Skip to Main Content
      </a>
      <nav
        className={`navbar fixed left-0 right-0 top-0 z-50 ${isHome ? 'navbar-home' : 'navbar-default'} ${navHidden ? 'navbar-hidden' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="page-shell flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            className={`pressable navbar-brand text-base font-bold ${isHome ? 'mix-blend-difference' : ''}`}
            aria-label="Wood home"
            translate="no"
            {...getPreloadProps('/')}
          >
            {brandIntroReady ? (
              <MotionSpan
                layoutId="brand-wordmark"
                className="navbar-brand-wordmark"
                transition={brandLayoutTransition}
              >
                wood
              </MotionSpan>
            ) : (
              <span className="navbar-brand-wordmark navbar-brand-wordmark-placeholder" aria-hidden="true">
                wood
              </span>
            )}
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`pressable nav-link label-text ${isHome ? 'mix-blend-difference' : ''} ${displayedLocation.pathname === link.to ? 'is-current' : ''}`}
                aria-current={displayedLocation.pathname === link.to ? 'page' : undefined}
                {...getPreloadProps(link.to)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="navbar-actions flex items-center gap-1 md:gap-3">
            <Link
              to="/wishlist"
              className={`pressable icon-button wishlist-toggle relative ${isHome ? 'mix-blend-difference' : ''} ${hasWishlistItems ? 'is-active' : ''}`}
              aria-label="Wishlist"
              {...getPreloadProps('/wishlist')}
            >
              <svg className="heart-icon heart-outline" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <svg className="heart-icon heart-filled" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </Link>

            <Link
              to="/cart"
              className={`pressable icon-button relative ${isHome ? 'mix-blend-difference' : ''}`}
              aria-label={`Cart with ${totalItems} items`}
              {...getPreloadProps('/cart')}
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              {totalItems > 0 && (
                <span className={`absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold text-white tabular-nums ${isHome ? 'mix-blend-difference' : ''}`}>
                  {totalItems}
                </span>
              )}
            </Link>

            <button
              className={`pressable icon-button mobile-menu-button ${isHome ? 'mix-blend-difference' : ''}`}
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} visualLocation={displayedLocation} />
    </>
  )
}
