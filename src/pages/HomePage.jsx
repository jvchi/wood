import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import LazyThreeScene from '../components/three/LazyThreeScene'
import ThreeModelPlaceholder from '../components/three/ThreeModelPlaceholder'
import { PersistentThreeSceneSlot } from '../components/three/PersistentThreeSceneProvider'

const HeroScene = lazy(() => import('../components/three/HeroScene'))
const ChairShowcaseScene = lazy(() => import('../components/three/ChairShowcaseScene'))

export default function HomePage() {
  const stickyRef = useRef(null)
  const scrollRef = useRef(null)
  const titleRef = useRef(null)
  const progressRef = useRef(0)
  const heroTargetProgressRef = useRef(0)
  const heroDisplayProgressRef = useRef(0)
  const showcaseRef = useRef(null)
  const showcaseProgressRef = useRef(0)
  const showcaseTargetProgressRef = useRef(0)
  const showcaseDisplayProgressRef = useRef(0)
  const [heroSceneActive, setHeroSceneActive] = useState(true)
  const [chairSceneActive, setChairSceneActive] = useState(true)
  const heroScene = useMemo(() => ({ active }) => (
    <LazyThreeScene
      fallback={<ThreeModelPlaceholder variant="room" label="Loading room view" />}
      variant="room"
      label="Loading room view"
    >
      <HeroScene active={active && heroSceneActive} scrollDriven scrollProgressRef={progressRef} />
    </LazyThreeScene>
  ), [heroSceneActive])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === scrollRef.current) {
          setHeroSceneActive(entry.isIntersecting)
        }
        if (entry.target === showcaseRef.current) {
          setChairSceneActive(entry.isIntersecting)
        }
      })
    }, {
      rootMargin: '35% 0px 35% 0px',
      threshold: 0,
    })

    if (scrollRef.current) observer.observe(scrollRef.current)
    if (showcaseRef.current) observer.observe(showcaseRef.current)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    function easeTitleDrop(progress) {
      const delayed = Math.min(1, Math.max(0, (progress - 0.08) / 0.92))
      const slowPull = Math.pow(delayed, 1.55) * 0.38
      const snapCatch = 1 - Math.pow(1 - delayed, 5.4)
      const snapWeight = Math.pow(delayed, 2.35)
      const settle = Math.sin(snapCatch * Math.PI) * 0.045 * (1 - delayed)
      return Math.min(1, Math.max(0, slowPull * (1 - snapWeight) + snapCatch * snapWeight + settle))
    }

    function applyHeroProgress(progress) {
      if (!stickyRef.current || !scrollRef.current) return
      const titleDropProgress = easeTitleDrop(progress)
      const titleDropDistance = titleRef.current
        ? Math.max(0, stickyRef.current.offsetHeight - titleRef.current.offsetTop - titleRef.current.offsetHeight)
        : 0
      progressRef.current = progress
      scrollRef.current.style.setProperty('--home-progress', progress.toFixed(4))
      scrollRef.current.style.setProperty('--home-radius', `${progress * 2}rem`)
      scrollRef.current.style.setProperty('--home-shadow-y', `${progress * 1.5}rem`)
      scrollRef.current.style.setProperty('--home-shadow-blur', `${progress * 5}rem`)
      scrollRef.current.style.setProperty('--home-sticky-y', `${progress * -1.25}rem`)
      scrollRef.current.style.setProperty('--home-scale', `${1 - progress * 0.15}`)
      scrollRef.current.style.setProperty('--home-stage-y', `${progress * -4}rem`)
      scrollRef.current.style.setProperty('--home-title-y', `${titleDropProgress * titleDropDistance}px`)
      scrollRef.current.style.setProperty('--home-title-opacity', '1')
      scrollRef.current.style.setProperty('--home-mobile-panel-y', `${progress * -2.5}rem`)
      scrollRef.current.style.setProperty('--home-mobile-panel-opacity', `${1 - progress * 0.45}`)
    }

    function measureChairProgress() {
      if (showcaseRef.current) {
        const rect = showcaseRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const revealStart = viewportHeight * 0.92
        const revealDistance = Math.max(viewportHeight * 0.9, rect.height * 0.75)
        const showcaseProgress = Math.min(1, Math.max(0, (revealStart - rect.top) / revealDistance))
        showcaseTargetProgressRef.current = showcaseProgress
      }
    }

    function applyChairProgress(progress) {
      showcaseProgressRef.current = progress
      showcaseRef.current?.style.setProperty('--chair-progress', progress.toFixed(4))
    }

    function smoothTo(current, target, factor = 0.18) {
      const next = current + (target - current) * factor
      return Math.abs(target - next) < 0.0008 ? target : next
    }

    const ctx = gsap.context(() => {
      const heroTrigger = ScrollTrigger.create({
        id: 'home-hero-lift',
        trigger: scrollRef.current,
        start: 'top top',
        end: () => showcaseRef.current?.offsetTop ?? Math.max(1, scrollRef.current.offsetHeight - stickyRef.current.offsetHeight),
        onUpdate: (self) => {
          const currentScroll = window.__lenis?.animatedScroll ?? window.scrollY
          const liftDistance = Math.max(1, scrollRef.current.offsetHeight - stickyRef.current.offsetHeight)
          const liftProgress = Math.min(1, Math.max(0, (currentScroll - self.start) / liftDistance))
          heroTargetProgressRef.current = liftProgress
          measureChairProgress()
        },
        onRefresh: (self) => {
          const currentScroll = window.__lenis?.animatedScroll ?? window.scrollY
          const liftDistance = Math.max(1, scrollRef.current.offsetHeight - stickyRef.current.offsetHeight)
          const liftProgress = Math.min(1, Math.max(0, (currentScroll - self.start) / liftDistance))
          heroTargetProgressRef.current = liftProgress
          heroDisplayProgressRef.current = liftProgress
          applyHeroProgress(liftProgress)
          measureChairProgress()
          showcaseDisplayProgressRef.current = showcaseTargetProgressRef.current
          applyChairProgress(showcaseTargetProgressRef.current)
        },
      })

      const chairTrigger = ScrollTrigger.create({
        id: 'home-chair-progress',
        trigger: showcaseRef.current,
        start: 'top 92%',
        end: 'bottom 20%',
        onUpdate: measureChairProgress,
        onRefresh: measureChairProgress,
      })

      applyHeroProgress(heroTrigger.progress)
      measureChairProgress()
      applyChairProgress(showcaseTargetProgressRef.current)

      const smoothing = window.matchMedia('(max-width: 767px)').matches ? 0.14 : 0.2
      const tick = () => {
        const nextHeroProgress = smoothTo(heroDisplayProgressRef.current, heroTargetProgressRef.current, smoothing)
        const nextChairProgress = smoothTo(showcaseDisplayProgressRef.current, showcaseTargetProgressRef.current, smoothing)

        if (nextHeroProgress !== heroDisplayProgressRef.current) {
          heroDisplayProgressRef.current = nextHeroProgress
          applyHeroProgress(nextHeroProgress)
        }

        if (nextChairProgress !== showcaseDisplayProgressRef.current) {
          showcaseDisplayProgressRef.current = nextChairProgress
          applyChairProgress(nextChairProgress)
        }
      }

      gsap.ticker.add(tick)

      return () => {
        gsap.ticker.remove(tick)
        chairTrigger.kill()
        heroTrigger.kill()
      }
    })

    return () => ctx.revert()
  }, [])

  return (
    <div className="home-couch-page">
      <section ref={scrollRef} className="home-couch-scroll" aria-label="Couch Place">
        <div ref={stickyRef} className="home-couch-sticky">
          <div className="home-couch-frame">
            <div className="home-couch-stage" aria-hidden="true">
              <PersistentThreeSceneSlot id="home-hero-room" interactive>
                {heroScene}
              </PersistentThreeSceneSlot>
            </div>
            <h1 ref={titleRef} className="home-couch-title" translate="no">
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

      <section ref={showcaseRef} className="home-chair-section" aria-label="Pipo chair showcase">
        <div className="home-chair-backdrop" aria-hidden="true">
          <span>Pipo Chair</span>
        </div>

        <div className="home-chair-stage">
          <Suspense fallback={<ThreeModelPlaceholder variant="chair" label="Loading chair view" />}>
            <LazyThreeScene
              fallback={<ThreeModelPlaceholder variant="chair" label="Loading chair view" />}
              variant="chair"
              label="Loading chair view"
            >
              <ChairShowcaseScene active={chairSceneActive} sectionProgressRef={showcaseProgressRef} />
            </LazyThreeScene>
          </Suspense>
        </div>

        <div className="home-chair-copy">
          <p className="home-chair-caption">Walnut frame, soft seat, quieter presence.</p>
        </div>
      </section>
    </div>
  )
}
