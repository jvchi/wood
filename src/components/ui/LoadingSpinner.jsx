import { useEffect, useState } from 'react'

export default function LoadingSpinner({
  className = '',
  label = 'Loading',
  size = 56,
  fullPage = false,
}) {
  const renderedSize = fullPage ? size : Math.min(size, 56)
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
        colors="primary:#777777,secondary:#b5b5b5"
        style={{ width: `${renderedSize}px`, height: `${renderedSize}px` }}
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}
