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
    playerRef.current.src = LOADER_SRC
    playerRef.current.autoplay = true
    playerRef.current.loop = true
  }, [])

  return (
    <div
      className={`loading-spinner is-lottie-loader ${fullPage ? 'loading-spinner-fullpage' : ''} ${className}`}
      role="status"
      aria-label={label}
    >
      <dotlottie-wc
        ref={playerRef}
        style={{ width: `${renderedSize}px`, height: `${renderedSize}px` }}
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}
