import '@lottiefiles/dotlottie-wc'
import { useEffect, useRef } from 'react'

const LOADER_SRC = '/loaders/app-loader.lottie'

export default function LoadingSpinner({
  className = '',
  label = 'Loading',
  size = 56,
  fullPage = false,
}) {
  const renderedSize = fullPage ? size : Math.min(size, 56)
  const playerRef = useRef(null)

  useEffect(() => {
    if (!playerRef.current) return
    playerRef.current.setAttribute('src', LOADER_SRC)
    playerRef.current.setAttribute('autoplay', '')
    playerRef.current.setAttribute('loop', '')
  }, [])

  return (
    <div
      className={`loading-spinner ${fullPage ? 'loading-spinner-fullpage' : ''} ${className}`}
      role="status"
      aria-label={label}
    >
      <dotlottie-wc
        ref={playerRef}
        class="loading-spinner-lottie"
        style={{ width: `${renderedSize}px`, height: `${renderedSize}px` }}
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}
