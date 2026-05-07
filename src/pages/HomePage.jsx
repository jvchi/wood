import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  motion as framerMotion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import LazyThreeScene from '../components/three/LazyThreeScene'
import ThreeModelPlaceholder from '../components/three/ThreeModelPlaceholder'
import { PersistentThreeSceneSlot } from '../components/three/PersistentThreeSceneProvider'
import Footer from '../components/layout/Footer'
import Skeleton from '../components/ui/Skeleton'
import { useProducts } from '../hooks/useProducts'

const HeroScene = lazy(() => import('../components/three/HeroScene'))
const ChairShowcaseScene = lazy(() => import('../components/three/ChairShowcaseScene'))
const MotionDiv = framerMotion.div
const BESTSELLER_SCROLL_DISTANCE = 1500

const bestSellerFloatLayouts = [
  { className: 'home-bestseller-float-lead', start: 80, end: -120 },
  { className: 'home-bestseller-float-one', start: -40, end: 90 },
  { className: 'home-bestseller-float-two', start: 60, end: -80 },
  { className: 'home-bestseller-float-three', start: -100, end: 140 },
  { className: 'home-bestseller-float-four', start: 60, end: -180 },
]

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

function BestSellerParallaxProduct({ product, layout, location }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [`${layout.start}px end`, `end ${layout.end * -1}px`],
  })
  const opacity = useTransform(scrollYProgress, [0, 0.72, 1], [1, 1, 0])
  const y = useTransform(scrollYProgress, [0, 1], [layout.start, layout.end])
  const transform = useMotionTemplate`translateY(${y}px)`

  return (
    <MotionDiv
      ref={ref}
      className={`home-bestseller-float ${layout.className}`}
      style={{ opacity, transform }}
    >
      <Link
        to={`/product/${product.id}`}
        state={{ backgroundLocation: location }}
        className="home-bestseller-product-link"
        aria-label={`View ${product.name}`}
        viewTransition
      >
        <img src={product.images[0]} alt={product.name} loading="lazy" />
      </Link>
    </MotionDiv>
  )
}

export default function HomePage() {
  const location = useLocation()
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
  const bestSellerDisplayProducts = bestSellerProducts.slice(0, 5)
  const floatingBestSellerProducts = bestSellerDisplayProducts
  const { scrollYProgress: bestSellerScrollProgress } = useScroll({
    target: bestSellerRef,
    offset: ['start start', 'end end'],
  })
  const bestSellerClipStart = useTransform(bestSellerScrollProgress, [0, 0.62], [28, 0])
  const bestSellerClipEnd = useTransform(bestSellerScrollProgress, [0, 0.62], [72, 100])
  const bestSellerClipPath = useMotionTemplate`polygon(${bestSellerClipStart}% ${bestSellerClipStart}%, ${bestSellerClipEnd}% ${bestSellerClipStart}%, ${bestSellerClipEnd}% ${bestSellerClipEnd}%, ${bestSellerClipStart}% ${bestSellerClipEnd}%)`
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

      <section
        ref={bestSellerRef}
        className="home-bestseller-section"
        aria-labelledby="home-bestseller-title"
        style={{ '--home-bestseller-scroll-distance': `${BESTSELLER_SCROLL_DISTANCE}px` }}
      >
        <div className="home-bestseller-shell">
          <div className="home-bestseller-header">
            <h2 id="home-bestseller-title" className="text-white mix-blend-difference">Best sellers</h2>
            <Link to="/shop" className="pressable home-bestseller-view text-white mix-blend-difference">
              View all
            </Link>
          </div>

          <div className="home-bestseller-board">
            {productsLoading ? (
              <div className="home-bestseller-loading" aria-hidden="true">
                <Skeleton className="home-bestseller-center-skeleton" />
                <div className="home-bestseller-loading-floats">
                  {bestSellerFloatLayouts.map((layout) => (
                    <Skeleton
                      className={`home-bestseller-float-skeleton ${layout.className}`}
                      key={layout.className}
                    />
                  ))}
                </div>
              </div>
            ) : bestSellerProducts.length > 0 ? (
              <div className="home-bestseller-scroll-stage">
                <MotionDiv
                  className="home-bestseller-center-image"
                  aria-hidden="true"
                  style={{
                    clipPath: bestSellerClipPath,
                  }}
                />

                <div className="home-bestseller-parallax-products">
                  {floatingBestSellerProducts.map((product, index) => (
                    <BestSellerParallaxProduct
                      key={product.id}
                      product={product}
                      layout={bestSellerFloatLayouts[index]}
                      location={location}
                    />
                  ))}
                </div>
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
      <Footer />
    </div>
  )
}
