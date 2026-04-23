import { Suspense, useEffect, useRef } from 'react'
import Skeleton from '../components/ui/Skeleton'
import HeroScene from '../components/three/HeroScene'

export default function HomePage() {
  const stickyRef = useRef(null)
  const scrollRef = useRef(null)
  const progressRef = useRef(0)

  useEffect(() => {
    let rafId = 0

    function updateProgress() {
      rafId = 0
      if (!stickyRef.current || !scrollRef.current) return
      const scrollLength = Math.max(1, scrollRef.current.offsetHeight - window.innerHeight)
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollLength))
      progressRef.current = progress
      scrollRef.current.style.setProperty('--home-progress', progress.toFixed(4))
      scrollRef.current.style.setProperty('--home-radius', `${progress * 2}rem`)
      scrollRef.current.style.setProperty('--home-shadow-y', `${progress * 1.5}rem`)
      scrollRef.current.style.setProperty('--home-shadow-blur', `${progress * 5}rem`)
      scrollRef.current.style.setProperty('--home-sticky-y', `${progress * -1.25}rem`)
      scrollRef.current.style.setProperty('--home-scale', `${1 - progress * 0.15}`)
      scrollRef.current.style.setProperty('--home-stage-y', `${progress * -4}rem`)
      scrollRef.current.style.setProperty('--home-title-y', `${progress * -5}rem`)
      scrollRef.current.style.setProperty('--home-title-opacity', `${1 - progress * 0.7}`)
      scrollRef.current.style.setProperty('--home-mobile-panel-y', `${progress * -2.5}rem`)
      scrollRef.current.style.setProperty('--home-mobile-panel-opacity', `${1 - progress * 0.45}`)
    }

    function requestUpdate() {
      if (rafId) return
      rafId = window.requestAnimationFrame(updateProgress)
    }

    updateProgress()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)

    return () => {
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div className="home-couch-page">
      <section ref={scrollRef} className="home-couch-scroll" aria-label="Couch Place">
        <div ref={stickyRef} className="home-couch-sticky">
          <div className="home-couch-frame">
            <div className="home-couch-stage" aria-hidden="true">
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <HeroScene scrollDriven scrollProgressRef={progressRef} />
              </Suspense>
            </div>
            <h1 className="home-couch-title" translate="no">
              <span>wood</span>
            </h1>
            <div className="home-mobile-panel">
              <p className="label-text-compact">Couch Place</p>
              <p>A quiet room built around one couch.</p>
              <span>Scroll</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
