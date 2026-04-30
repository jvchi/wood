import { useEffect, useState } from 'react'

export default function LoadingSpinner({
  className = '',
  label = 'Loading',
  size = 160,
  fullPage = false,
}) {
  const [lordiconReady, setLordiconReady] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean(window.customElements?.get('lord-icon'))
  })

  useEffect(() => {
    if (lordiconReady || typeof window === 'undefined' || !window.customElements?.whenDefined) return undefined

    let cancelled = false
    window.customElements.whenDefined('lord-icon').then(() => {
      if (!cancelled) setLordiconReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [lordiconReady])

  return (
    <div
      className={`loading-spinner ${lordiconReady ? 'is-lordicon-ready' : ''} ${fullPage ? 'loading-spinner-fullpage' : ''} ${className}`}
      role="status"
      aria-label={label}
    >
      <lord-icon
        src="https://cdn.lordicon.com/flabvqvs.json"
        trigger="loop"
        state="loop-spiral"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}
