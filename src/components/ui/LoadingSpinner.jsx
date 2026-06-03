import { useEffect, useRef, useState } from 'react'

const LOADER_SRC = '/loaders/app-loader.json'

export default function LoadingSpinner({
  className = '',
  label = 'Loading',
  size = 56,
  fullPage = false,
}) {
  const renderedSize = fullPage ? size : Math.min(size, 56)
  const containerRef = useRef(null)
  const [lottieReady, setLottieReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return undefined
    let cancelled = false
    let animation = null

    async function startAnimation() {
      const lottieModule = await import('lottie-web/build/player/lottie_light.js')
      if (cancelled || !containerRef.current) return
      const player = lottieModule.default?.loadAnimation
        ? lottieModule.default
        : lottieModule.loadAnimation
          ? lottieModule
          : window.lottie
      if (typeof player?.loadAnimation !== 'function') return

      animation = player.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: LOADER_SRC,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
        },
      })

      animation.addEventListener('DOMLoaded', handleReady)
    }

    const handleReady = () => {
      if (cancelled || !animation) return
      animation.play()
      setLottieReady(true)
    }

    startAnimation().catch(() => {
      if (!cancelled) setLottieReady(false)
    })

    return () => {
      cancelled = true
      animation?.removeEventListener('DOMLoaded', handleReady)
      animation?.destroy()
    }
  }, [])

  return (
    <div
      className={`loading-spinner ${lottieReady ? 'is-lottie-ready' : ''} ${fullPage ? 'loading-spinner-fullpage' : ''} ${className}`}
      role="status"
      aria-label={label}
    >
      <div
        ref={containerRef}
        className="loading-spinner-lottie"
        aria-hidden="true"
        style={{ width: `${renderedSize}px`, height: `${renderedSize}px` }}
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}
