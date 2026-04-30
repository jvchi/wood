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
      className={`fixed inset-0 z-[100] flex flex-col bg-white transition-[opacity,transform] duration-[260ms] ease-[var(--ease-out)] ${
        isOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <div className="page-shell flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)]">
        <Link
          to="/"
          className="pressable text-base font-bold uppercase"
          translate="no"
        >
          Wood
        </Link>
        <button
          onClick={onClose}
          className="pressable icon-button"
          aria-label="Close menu"
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="page-shell flex flex-1 flex-col justify-center gap-2">
        {navLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`pressable drawer-link inline-flex min-h-14 items-center text-[clamp(2rem,13vw,4.5rem)] font-bold uppercase leading-none ${displayedLocation.pathname === link.to ? 'is-current' : ''}`}
            aria-current={displayedLocation.pathname === link.to ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
