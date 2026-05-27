import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
]

export default function MobileNav({ isOpen, onClose, visualLocation }) {
  const overlayRef = useRef(null)
  const location = useLocation()
  const displayedLocation = visualLocation || location
  const previousPathnameRef = useRef(location.pathname)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      previousPathnameRef.current = location.pathname
      return undefined
    }

    if (previousPathnameRef.current === location.pathname) return undefined
    previousPathnameRef.current = location.pathname

    const timer = window.setTimeout(onClose, 320)
    return () => window.clearTimeout(timer)
  }, [isOpen, location.pathname, onClose])

  return (
    <div
      ref={overlayRef}
      id="mobile-navigation-menu"
      className={`fixed inset-0 z-[90] flex flex-col bg-white pt-16 transition-[opacity,transform] duration-[260ms] ease-[var(--ease-out)] ${
        isOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none'
      }`}
      role="navigation"
      aria-hidden={!isOpen}
      aria-label="Mobile navigation"
    >
      <div className="page-shell flex flex-1 flex-col items-center justify-center gap-2 text-center">
        {navLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`pressable drawer-link inline-flex min-h-14 items-center justify-center text-[clamp(2rem,13vw,4.5rem)] font-bold uppercase leading-none ${displayedLocation.pathname === link.to ? 'is-current' : ''}`}
            aria-current={displayedLocation.pathname === link.to ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
