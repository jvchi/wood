import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import LazyThreeScene from '../components/three/LazyThreeScene'
import ThreeModelPlaceholder from '../components/three/ThreeModelPlaceholder'
import { PersistentThreeSceneSlot } from '../components/three/PersistentThreeSceneProvider'
import ProductCard from '../components/ui/ProductCard'
import Skeleton from '../components/ui/Skeleton'
import { useProducts } from '../hooks/useProducts'

const HeroScene = lazy(() => import('../components/three/HeroScene'))
const ChairShowcaseScene = lazy(() => import('../components/three/ChairShowcaseScene'))

gsap.registerPlugin(SplitText)

function markHomeSceneReady(sceneName) {
  document.documentElement.dataset[sceneName] = 'true'
  if (
    document.documentElement.dataset.homeHeroReady === 'true' &&
    document.documentElement.dataset.homeChairReady === 'true'
  ) {
    window.dispatchEvent(new Event('wood:home-scenes-ready'))
  }
}

export default function HomePage() {
  const stickyRef = useRef(null)
  const scrollRef = useRef(null)
  const bestSellerRef = useRef(null)
  const titleRef = useRef(null)
  const progressRef = useRef(0)
  const heroTargetProgressRef = useRef(0)
  const heroDisplayProgressRef = useRef(0)
  const showcaseRef = useRef(null)
  const chairTitleRef = useRef(null)
  const showcaseProgressRef = useRef(0)
  const showcaseTargetProgressRef = useRef(0)
  const showcaseDisplayProgressRef = useRef(0)
  const [heroSceneActive, setHeroSceneActive] = useState(true)
  const [chairSceneActive, setChairSceneActive] = useState(true)
  const { products, loading: productsLoading } = useProducts()
  const bestSellerProducts = useMemo(() => {
    const bestSellers = products.filter(product => product.best_seller)
    const bestSellerIds = new Set(bestSellers.map(product => product.id))
    const supportingProducts = products.filter(product => !bestSellerIds.has(product.id))
    return [...bestSellers, ...supportingProducts].slice(0, 8)
  }, [products])
  const heroScene = useMemo(() => ({ active }) => (
    <LazyThreeScene
      fallback={null}
      variant="room"
      label="Loading room view"
      idleTimeout={0}
    >
      <HeroScene
        active={active && heroSceneActive}
        scrollDriven
        scrollProgressRef={progressRef}
        onReady={() => {
          markHomeSceneReady('homeHeroReady')
        }}
      />
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
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
          heroTargetProgressRef.current = self.progress
          measureChairProgress()
        },
        onRefresh: (self) => {
          const progress = self.progress
          heroTargetProgressRef.current = progress
          heroDisplayProgressRef.current = progress
          applyHeroProgress(progress)
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

      let chairTitleSplit = null

      if (chairTitleRef.current) {
        if (reducedMotion) {
          gsap.set(chairTitleRef.current, { clearProps: 'all' })
        } else {
          chairTitleSplit = SplitText.create(chairTitleRef.current, {
            type: 'lines',
            mask: 'lines',
            linesClass: 'home-chair-title-line',
            autoSplit: true,
            onSplit(self) {
              const tl = gsap.timeline({
                scrollTrigger: {
                  id: 'home-chair-title-mask',
                  trigger: showcaseRef.current,
                  start: 'top 88%',
                  end: 'top 32%',
                  scrub: 0.8,
                  invalidateOnRefresh: true,
                },
              })

              tl.fromTo(
                self.lines,
                { yPercent: 112, rotate: 2.5 },
                {
                  yPercent: 0,
                  rotate: 0,
                  duration: 1,
                  ease: 'power3.out',
                  stagger: 0.08,
                },
              )

              return tl
            },
          })
        }
      }
      ScrollTrigger.create({
        id: 'home-page-snap',
        snap: {
          snapTo: (value) => {
            const max = ScrollTrigger.maxScroll(window)
            if (max <= 0) return value

            const chairTop = showcaseRef.current?.offsetTop ?? 0
            const shopTop = bestSellerRef.current?.offsetTop ?? max

            const isMobile = window.innerWidth < 768
            const chairSnap = isMobile && showcaseRef.current
              ? Math.max(chairTop, chairTop + showcaseRef.current.offsetHeight - window.innerHeight)
              : chairTop

            const progressStops = [0, chairSnap, shopTop].map(s => s / max)
            const closest = progressStops.reduce((prev, curr) =>
              Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
            )

            // Proximity check: only snap if within 12% of a section stop
            return Math.abs(closest - value) < 0.12 ? closest : value
          },
          duration: { min: 0.3, max: 0.8 },
          delay: 0.12,
          ease: 'power2.inOut',
        },
      })


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
        chairTitleSplit?.revert()
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
          <span ref={chairTitleRef}>Pipo Chair</span>
        </div>

        <div className="home-chair-stage">
          <Suspense fallback={<ThreeModelPlaceholder variant="chair" label="Loading chair view" />}>
            <LazyThreeScene
              fallback={null}
              variant="chair"
              label="Loading chair view"
              idleTimeout={0}
            >
              <ChairShowcaseScene
                active={chairSceneActive}
                sectionProgressRef={showcaseProgressRef}
                onReady={() => {
                  markHomeSceneReady('homeChairReady')
                }}
              />
            </LazyThreeScene>
          </Suspense>
        </div>

        <div className="home-chair-copy">
          <p className="home-chair-caption">Walnut frame, soft seat, quieter presence.</p>
        </div>
      </section>

      <section ref={bestSellerRef} className="home-bestseller-section" aria-labelledby="home-bestseller-title">
        <div className="home-bestseller-shell">
          <div className="home-bestseller-header">
            <h2 id="home-bestseller-title">Best sellers</h2>
            <Link to="/shop" className="pressable home-bestseller-view">
              View all
            </Link>
          </div>

          <div className="home-bestseller-board">
            {productsLoading ? (
              <div className="home-bestseller-grid home-bestseller-grid-loading" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div className="home-bestseller-card-skeleton" key={index}>
                    <Skeleton className="home-bestseller-skeleton-media" />
                    <Skeleton className="mt-3 h-3 w-28" />
                    <Skeleton className="mt-2 h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : bestSellerProducts.length > 0 ? (
              <div className="home-bestseller-grid">
                {bestSellerProducts.slice(0, 5).map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} hideInfo={true} />
                ))}
              </div>
            ) : (
              <div className="home-bestseller-empty">
                <p>No best sellers are available right now.</p>
                <Link to="/shop" className="pressable home-bestseller-empty-link">
                  Browse the shop
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
