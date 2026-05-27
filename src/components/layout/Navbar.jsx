import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion as framerMotion, useReducedMotion } from 'framer-motion'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import { preloadAppRoute } from '../../lib/routePreload'
import { loaderMotion } from '../../lib/transitionConfig'
import AnimatedNumber from '../ui/AnimatedNumber'
import MobileNav from './MobileNav'

const MotionSpan = framerMotion.span
const MotionLink = framerMotion.create(Link)
const MotionButton = framerMotion.button
const MotionLine = framerMotion.line
const brandLayoutTransition = loaderMotion.brandLayout
const productMenuEntryTransition = {
  type: 'spring',
  bounce: 0.4,
  ease: 'linear',
  damping: 13,
  stiffness: 150,
}
const mobileNavActionShift = 48

function MorphMenuIcon({ isOpen, reduceMotion }) {
  const lineTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 520, damping: 34, mass: 0.55 }
  const lines = isOpen
    ? [
        { x1: 6, y1: 6, x2: 18, y2: 18, opacity: 1 },
        { x1: 12, y1: 12, x2: 12, y2: 12, opacity: 0 },
        { x1: 6, y1: 18, x2: 18, y2: 6, opacity: 1 },
      ]
    : [
        { x1: 3, y1: 6, x2: 21, y2: 6, opacity: 1 },
        { x1: 3, y1: 12, x2: 21, y2: 12, opacity: 1 },
        { x1: 3, y1: 18, x2: 21, y2: 18, opacity: 1 },
      ]

  return (
    <svg
      className="morph-menu-icon"
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      {lines.map((line, index) => (
        <MotionLine
          key={index}
          initial={false}
          animate={line}
          transition={lineTransition}
        />
      ))}
    </svg>
  )
}

export default function Navbar({ brandIntroReady = true, visualLocation }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobileNav, setIsMobileNav] = useState(() => (
    typeof window === 'undefined' ? false : window.matchMedia('(max-width: 767px)').matches
  ))
  const reduceMotion = useReducedMotion()
  const { totalItems } = useCart()
  const { items: wishlistItems } = useWishlist()
  const location = useLocation()
  const displayedLocation = visualLocation || location
  const hasWishlistItems = wishlistItems.length > 0
  const isHome = displayedLocation.pathname === '/'
  const isProductRoute = location.pathname.startsWith('/product/')
  const shouldAnimateProductActions = isProductRoute && isMobileNav && !reduceMotion
  const productActionTransition = delay => ({
    ...productMenuEntryTransition,
    delay: shouldAnimateProductActions ? delay : 0,
  })

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const handleChange = () => setIsMobileNav(media.matches)

    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

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

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold">
        Skip to Main Content
      </a>
      <nav
        className={`navbar fixed left-0 right-0 top-0 ${mobileOpen ? 'z-[120]' : 'z-50'} ${isHome ? 'navbar-home' : 'navbar-default'}`}
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
                className={`pressable nav-link label-text ${isHome ? 'mix-blend-difference text-white' : ''} ${displayedLocation.pathname === link.to ? 'is-current' : ''}`}
                aria-current={displayedLocation.pathname === link.to ? 'page' : undefined}
                {...getPreloadProps(link.to)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="navbar-actions flex items-center gap-1 md:gap-3">
            <MotionLink
              to="/wishlist"
              className={`pressable icon-button wishlist-toggle relative ${isHome ? 'mix-blend-difference' : ''} ${hasWishlistItems ? 'is-active' : ''}`}
              aria-label="Wishlist"
              animate={{
                x: shouldAnimateProductActions ? mobileNavActionShift : 0,
                filter: shouldAnimateProductActions ? 'blur(0px)' : 'blur(0px)',
              }}
              transition={productActionTransition(shouldAnimateProductActions ? 0.08 : 0.12)}
              {...getPreloadProps('/wishlist')}
            >
              <svg className="heart-icon heart-outline" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <svg className="heart-icon heart-filled" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </MotionLink>

            <MotionLink
              to="/cart"
              className={`pressable icon-button relative ${isHome ? 'mix-blend-difference' : ''}`}
              aria-label={`Cart with ${totalItems} items`}
              animate={{
                x: shouldAnimateProductActions ? mobileNavActionShift : 0,
                filter: shouldAnimateProductActions ? 'blur(0px)' : 'blur(0px)',
              }}
              transition={productActionTransition(shouldAnimateProductActions ? 0.03 : 0.06)}
              {...getPreloadProps('/cart')}
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {totalItems > 0 && (
                <span className={`cart-count-badge ${isHome ? 'mix-blend-difference' : ''}`}>
                  <AnimatedNumber value={totalItems} aria-label={`${totalItems} cart items`} />
                </span>
              )}
            </MotionLink>

            <MotionButton
              className={`pressable icon-button mobile-menu-button ${isHome ? 'mix-blend-difference' : ''}`}
              type="button"
              onClick={() => setMobileOpen(open => !open)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-controls="mobile-navigation-menu"
              aria-expanded={mobileOpen}
              animate={{
                opacity: shouldAnimateProductActions ? 0 : 1,
                x: shouldAnimateProductActions ? mobileNavActionShift : 0,
                filter: shouldAnimateProductActions ? 'blur(6px)' : 'blur(0px)',
              }}
              transition={productActionTransition(shouldAnimateProductActions ? 0 : 0)}
              style={{ pointerEvents: shouldAnimateProductActions ? 'none' : 'auto' }}
            >
              <MorphMenuIcon isOpen={mobileOpen} reduceMotion={reduceMotion} />
            </MotionButton>
          </div>
        </div>
      </nav>

      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} visualLocation={displayedLocation} />
    </>
  )
}
