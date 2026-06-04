import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import {
  motion as framerMotion,
  useAnimationControls,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion'
import { Squircle } from '@squircle-js/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import LazyThreeScene from '../components/three/LazyThreeScene'
import ThreeModelPlaceholder from '../components/three/ThreeModelPlaceholder'
import { PersistentThreeSceneSlot } from '../components/three/PersistentThreeSceneProvider'
import Footer from '../components/layout/Footer'
import Skeleton from '../components/ui/Skeleton'
import { LetterCascade } from '../components/ui/LetterCascade'
import { useProducts } from '../hooks/useProducts'
import { formatPrice } from '../utils/formatPrice'

const HeroScene = lazy(() => import('../components/three/HeroScene'))
const ChairShowcaseScene = lazy(() => import('../components/three/ChairShowcaseScene'))
const MotionDiv = framerMotion.div
const MotionImg = framerMotion.img

const bestSellerSkeletonItems = Array.from({ length: 4 }, (_, index) => index)
const bestSellerLayerConfigs = [
  { className: 'home-bestseller-stack-base', yRange: [16, -18] },
  { className: 'home-bestseller-stack-layer-one', yRange: [40, -118] },
  { className: 'home-bestseller-stack-layer-two', yRange: [72, -180] },
]
const bestSellerStackTransition = {
  type: 'spring',
  bounce: 0.4,
  ease: 'linear',
  damping: 13,
  stiffness: 150,
}
const BEST_SELLER_HOVER_DELAY = 50
const bestSellerLayerHoverDelays = [0, 0.035, 0.07]
const bestSellerLayerExitDelays = [0.12, 0.08, 0.04]
gsap.registerPlugin(ScrollTrigger, SplitText)

function markHomeSceneReady(sceneName) {
  document.documentElement.dataset[sceneName] = 'true'
  if (
    document.documentElement.dataset.homeHeroReady === 'true' &&
    document.documentElement.dataset.homeChairReady === 'true'
  ) {
    window.dispatchEvent(new Event('wood:home-scenes-ready'))
  }
}

function BestSellerHoverLabel({ label, reduceMotion }) {
  if (typeof document === 'undefined' || !label) return null

  return createPortal(
    <div
      className="home-bestseller-hover-label"
      aria-hidden="true"
      style={{
        '--label-left': `${label.left}px`,
        '--label-top': `${label.top}px`,
        '--label-width': `${label.width}px`,
      }}
    >
      <MotionDiv
        className="home-bestseller-hover-label-inner"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 12, filter: reduceMotion ? 'blur(0px)' : 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{
          ...bestSellerStackTransition,
          delay: reduceMotion ? 0 : 0.17,
        }}
      >
        <strong>{label.name}</strong>
        <em>{label.price}</em>
      </MotionDiv>
    </div>,
    document.body,
  )
}

function BestSellerStackedProduct({ product, index, location, onHoverLabelChange }) {
  const ref = useRef(null)
  const hoverDelayRef = useRef(null)
  const touchRevertTimerRef = useRef(null)
  const isTouchExpandedRef = useRef(false)
  const lastPointerTypeRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const [isHovered, setIsHovered] = useState(false)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const baseY = useTransform(scrollYProgress, [0, 1], bestSellerLayerConfigs[0].yRange)
  const layerOneY = useTransform(scrollYProgress, [0, 1], bestSellerLayerConfigs[1].yRange)
  const layerTwoY = useTransform(scrollYProgress, [0, 1], bestSellerLayerConfigs[2].yRange)
  const layerImages = [
    { src: product.images[0], alt: product.name, y: baseY, ...bestSellerLayerConfigs[0] },
    { src: product.images[1], alt: '', y: layerOneY, ...bestSellerLayerConfigs[1] },
    { src: product.images[2], alt: '', y: layerTwoY, ...bestSellerLayerConfigs[2] },
  ].filter(layer => layer.src)
  const isMirroredStack = index % 4 === 2
  const updateHoverLabel = () => {
    const bounds = ref.current?.getBoundingClientRect()
    if (!bounds) return

    onHoverLabelChange({
      id: product.id,
      name: product.name,
      price: formatPrice(product.price),
      left: bounds.left + bounds.width * 0.15,
      top: bounds.top + bounds.height * 0.74,
      width: Math.min(256, bounds.width * 0.62),
    })
  }
  const clearHoverDelay = () => {
    if (hoverDelayRef.current) {
      window.clearTimeout(hoverDelayRef.current)
      hoverDelayRef.current = null
    }
  }
  const clearTouchRevertTimer = () => {
    if (touchRevertTimerRef.current) {
      window.clearTimeout(touchRevertTimerRef.current)
      touchRevertTimerRef.current = null
    }
  }
  const startTouchRevertTimer = () => {
    clearTouchRevertTimer()
    touchRevertTimerRef.current = window.setTimeout(() => {
      touchRevertTimerRef.current = null
      isTouchExpandedRef.current = false
      setIsHovered(false)
      onHoverLabelChange(null)
    }, 5000)
  }
  const handleLinkClick = event => {
    // Only intercept touch interactions
    if (lastPointerTypeRef.current !== 'touch') return
    if (isTouchExpandedRef.current) {
      // Second tap within 5 s — clear timer and let Link navigate naturally
      clearTouchRevertTimer()
      isTouchExpandedRef.current = false
    } else {
      // First tap — block navigation, trigger hover animation, start revert timer
      event.preventDefault()
      isTouchExpandedRef.current = true
      setIsHovered(true)
      updateHoverLabel()
      startTouchRevertTimer()
    }
  }
  const queueHover = event => {
    if (event?.pointerType === 'touch') return
    if (hoverDelayRef.current || isHovered) return

    hoverDelayRef.current = window.setTimeout(() => {
      hoverDelayRef.current = null
      setIsHovered(true)
      updateHoverLabel()
    }, BEST_SELLER_HOVER_DELAY)
  }
  const resetHover = () => {
    clearHoverDelay()
    // Only reset hover for non-touch (touch state is managed by tap handler)
    if (!isTouchExpandedRef.current) {
      setIsHovered(false)
      onHoverLabelChange(null)
    }
  }
  const getLayerStackOrderVariants = layerIndex => {
    if (layerIndex === 0) {
      return {
        rest: { zIndex: 1 },
        hover: { zIndex: 4 },
      }
    }

    return {
      rest: { zIndex: layerIndex + 1 },
      hover: { zIndex: 2 - layerIndex },
    }
  }
  const getLayerPlaneVariants = layerIndex => {
    const rest = {
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      rotate: 0,
      opacity: 1,
    }

    if (reduceMotion) {
      return {
        rest,
        hover: {
          ...rest,
          opacity: layerIndex === 0 ? 1 : 0.98,
        },
      }
    }

    const layerTransition = state => ({
      ...bestSellerStackTransition,
      delay: reduceMotion
        ? 0
        : state === 'hover'
          ? bestSellerLayerHoverDelays[layerIndex]
          : bestSellerLayerExitDelays[layerIndex],
    })

    if (layerIndex === 0) {
      return {
        rest: {
          ...rest,
          transition: layerTransition('rest'),
        },
        hover: {
          ...rest,
          z: 96,
          scale: 1.06,
          transition: layerTransition('hover'),
        },
      }
    }

    const startsOnLeft = layerIndex === 1 ? !isMirroredStack : isMirroredStack
    const stackDirection = startsOnLeft ? 1 : -1

    return {
      rest: {
        ...rest,
        transition: layerTransition('rest'),
      },
      hover: {
        x: `${stackDirection * (layerIndex === 1 ? 118 : 88)}%`,
        y: layerIndex === 1 ? '-22%' : '18%',
        z: layerIndex === 1 ? -74 : -118,
        scale: layerIndex === 1 ? 0.76 : 0.68,
        rotate: stackDirection * (layerIndex === 1 ? -5 : 4),
        opacity: layerIndex === 1 ? 0.96 : 0.9,
        transition: layerTransition('hover'),
      },
    }
  }
  useEffect(() => () => {
    clearHoverDelay()
    clearTouchRevertTimer()
    onHoverLabelChange(null)
  }, [onHoverLabelChange])
  useEffect(() => {
    const handleScroll = () => {
      // Only revert hover on scroll for non-touch expanded state
      if (!isTouchExpandedRef.current) {
        clearHoverDelay()
        setIsHovered(false)
        onHoverLabelChange(null)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  })

  return (
    <article
      ref={ref}
      className={`home-bestseller-stack-card${isHovered ? ' is-hovered' : ''}`}
      style={{ '--stack-index': index % 4 }}
      onPointerEnter={queueHover}
      onPointerMove={queueHover}
      onPointerLeave={resetHover}
      onPointerCancel={resetHover}
      onMouseEnter={queueHover}
      onMouseLeave={resetHover}
      onFocus={() => {
        setIsHovered(true)
        updateHoverLabel()
      }}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          resetHover()
        }
      }}
    >
      <Link
        to={`/product/${product.id}`}
        state={{ backgroundLocation: location }}
        className="home-bestseller-stack-link"
        aria-label={`View ${product.name}`}
        viewTransition
        onPointerDown={e => { lastPointerTypeRef.current = e.pointerType }}
        onClick={handleLinkClick}
      >
        <MotionDiv
          className="home-bestseller-stack-media"
          initial={false}
          animate={isHovered ? 'hover' : 'rest'}
        >
          {layerImages.map((layer, layerIndex) => (
            <MotionDiv
              className={`home-bestseller-stack-image ${layer.className}`}
              variants={getLayerStackOrderVariants(layerIndex)}
              transition={bestSellerStackTransition}
              style={{ y: layer.y }}
              key={`${product.id}-${layerIndex}-${layer.src}`}
            >
              <MotionDiv
                className="home-bestseller-stack-plane"
                variants={getLayerPlaneVariants(layerIndex)}
                transition={bestSellerStackTransition}
              >
                <MotionImg
                  src={layer.src}
                  alt={layer.alt}
                  width={layerIndex === 0 ? 900 : 520}
                  height={layerIndex === 0 ? 1125 : 650}
                  loading="lazy"
                />
              </MotionDiv>
            </MotionDiv>
          ))}
        </MotionDiv>
      </Link>
    </article>
  )
}

export default function HomePage() {
  const location = useLocation()
  const stickyRef = useRef(null)
  const scrollRef = useRef(null)
  const bestSellerRef = useRef(null)
  const bestSellerActionRef = useRef(null)
  const bestSellerActionFlipRectRef = useRef(null)
  const bestSellerHeaderRef = useRef(null)
  const titleRef = useRef(null)
  const progressRef = useRef(0)
  const heroTargetProgressRef = useRef(0)
  const heroDisplayProgressRef = useRef(0)
  const showcaseRef = useRef(null)
  const chairTitleRef = useRef(null)
  const showcaseProgressRef = useRef(0)
  const showcaseTargetProgressRef = useRef(0)
  const showcaseDisplayProgressRef = useRef(0)
  const bestSellerActionModeRef = useRef('rest')
  const reduceMotion = useReducedMotion()
  const bestSellerActionControls = useAnimationControls()
  const [heroSceneActive, setHeroSceneActive] = useState(true)
  const [chairSceneActive, setChairSceneActive] = useState(true)
  const [bestSellerActionMode, setBestSellerActionMode] = useState('rest')
  const [bestSellerHoverLabel, setBestSellerHoverLabel] = useState(null)
  const [showHeroScrollHint, setShowHeroScrollHint] = useState(false)
  const { products, loading: productsLoading } = useProducts()
  const bestSellerProducts = useMemo(
    () => products.filter(product => product.best_seller).slice(0, 8),
    [products],
  )
  const heroScene = useMemo(() => ({ active }) => (
    <LazyThreeScene
      fallback={<ThreeModelPlaceholder variant="room" label="Loading room view" />}
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
    let idleTimer = 0
    let revealTimer = 0

    const clearIdleTimer = () => {
      if (!idleTimer) return
      window.clearTimeout(idleTimer)
      idleTimer = 0
    }

    const clearRevealTimer = () => {
      if (!revealTimer) return
      window.clearTimeout(revealTimer)
      revealTimer = 0
    }

    const isHeroInView = () => {
      const rect = scrollRef.current?.getBoundingClientRect()
      if (!rect) return false
      return rect.top <= 1 && rect.bottom > window.innerHeight * 0.5
    }

    const queueHintReturn = () => {
      clearIdleTimer()
      idleTimer = window.setTimeout(() => {
        idleTimer = 0
        if (isHeroInView()) {
          setShowHeroScrollHint(true)
        }
      }, 5000)
    }

    const handleScroll = () => {
      clearRevealTimer()
      if (isHeroInView()) {
        setShowHeroScrollHint(false)
        queueHintReturn()
      } else {
        setShowHeroScrollHint(false)
        clearIdleTimer()
      }
    }

    revealTimer = window.setTimeout(() => {
      revealTimer = 0
      if (isHeroInView()) {
        setShowHeroScrollHint(true)
      }
    }, 500)

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', queueHintReturn)

    return () => {
      clearRevealTimer()
      clearIdleTimer()
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', queueHintReturn)
    }
  }, [])

  useEffect(() => {
    const action = bestSellerActionRef.current
    const section = bestSellerRef.current

    if (!action || !section) {
      return undefined
    }

    let frame = 0

    const updateActionPosition = () => {
      frame = 0

      if (!window.matchMedia('(max-width: 880px)').matches) {
        if (bestSellerActionModeRef.current !== 'rest') {
          bestSellerActionModeRef.current = 'rest'
          setBestSellerActionMode('rest')
        }
        return
      }

      const rect = section.getBoundingClientRect()
      const visualViewport = window.visualViewport
      const viewportHeight = visualViewport?.height ?? window.innerHeight
      const bottomOffset = Math.max(20, visualViewport ? window.innerHeight - visualViewport.height + 20 : 20)
      const actionHeight = action.offsetHeight
      const headerHeight = bestSellerHeaderRef.current?.offsetHeight ?? 0
      const fixedLine = viewportHeight - bottomOffset - actionHeight
      const entryLine = fixedLine - headerHeight - 16
      const sectionBottomLine = viewportHeight - bottomOffset
      const nextMode = rect.bottom <= sectionBottomLine
        ? 'anchored'
        : rect.top <= entryLine
          ? 'fixed'
          : 'rest'

      if (bestSellerActionModeRef.current !== nextMode) {
        bestSellerActionFlipRectRef.current = action.getBoundingClientRect()
        bestSellerActionModeRef.current = nextMode
        setBestSellerActionMode(nextMode)
      }
    }

    const requestUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateActionPosition)
    }

    updateActionPosition()
    gsap.ticker.add(updateActionPosition)
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)
    window.visualViewport?.addEventListener('resize', requestUpdate)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      gsap.ticker.remove(updateActionPosition)
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
      window.visualViewport?.removeEventListener('resize', requestUpdate)
    }
  }, [])

  useLayoutEffect(() => {
    const action = bestSellerActionRef.current
    const previousRect = bestSellerActionFlipRectRef.current
    bestSellerActionFlipRectRef.current = null

    if (!action || !previousRect || !window.matchMedia('(max-width: 880px)').matches) {
      bestSellerActionControls.set({ x: 0, y: 0, scale: 1 })
      return
    }

    const nextRect = action.getBoundingClientRect()
    const deltaX = previousRect.left - nextRect.left
    const deltaY = previousRect.top - nextRect.top

    if (reduceMotion || (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5)) {
      bestSellerActionControls.set({ x: 0, y: 0, scale: 1 })
      return
    }

    bestSellerActionControls.stop()
    bestSellerActionControls.set({ x: deltaX, y: deltaY, scale: 1 })
    bestSellerActionControls.start({
      x: 0,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 520, damping: 38, mass: 0.8 },
    })
  }, [bestSellerActionControls, bestSellerActionMode, reduceMotion])

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
        end: () => {
          if (showcaseRef.current) return showcaseRef.current.offsetTop
          if (!scrollRef.current || !stickyRef.current) return 1
          return Math.max(1, scrollRef.current.offsetHeight - stickyRef.current.offsetHeight)
        },
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

      const refreshBestSellerTrigger = () => ScrollTrigger.refresh()
      const refreshFrame = window.requestAnimationFrame(refreshBestSellerTrigger)

      window.addEventListener('orientationchange', refreshBestSellerTrigger)

      let chairTitleSplit = null
      let bestSellerTitleSplit = null

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
                  start: 'top 55%',
                  end: 'top 15%',
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

      if (bestSellerHeaderRef.current) {
        const titleEl = bestSellerHeaderRef.current.querySelector('h2')
        if (titleEl) {
          if (reducedMotion) {
            gsap.set(titleEl, { clearProps: 'all' })
          } else {
            bestSellerTitleSplit = SplitText.create(titleEl, {
              type: 'lines',
              mask: 'lines',
              linesClass: 'home-bestseller-title-line',
              autoSplit: true,
              onSplit(self) {
                const tl = gsap.timeline({
                  scrollTrigger: {
                    id: 'home-bestseller-title-mask',
                    trigger: bestSellerRef.current,
                    start: 'top 55%',
                    end: 'top 15%',
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
        window.cancelAnimationFrame(refreshFrame)
        window.removeEventListener('orientationchange', refreshBestSellerTrigger)
        gsap.ticker.remove(tick)
        chairTitleSplit?.revert()
        bestSellerTitleSplit?.revert()
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
              <p className="label-text-compact">The Sofa Room</p>
              <p>Settle into the shape of home.</p>
            </div>
            <MotionDiv
              className="home-scroll-hint"
              aria-hidden="true"
              initial="hidden"
              animate={showHeroScrollHint ? 'visible' : 'hidden'}
              variants={{
                visible: {
                  opacity: 1,
                  x: '-50%',
                  y: 0,
                  filter: 'blur(0px)',
                  scale: 1,
                  transition: {
                    type: 'spring',
                    stiffness: 360,
                    damping: 30,
                    mass: 0.7,
                  },
                },
                hidden: {
                  opacity: 0,
                  x: '-50%',
                  y: 18,
                  filter: 'blur(8px)',
                  scale: 0.96,
                  transition: {
                    type: 'spring',
                    stiffness: 440,
                    damping: 34,
                    mass: 0.65,
                  },
                },
              }}
            >
              <span />
            </MotionDiv>
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
              fallback={<ThreeModelPlaceholder variant="chair" label="Loading chair view" />}
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
          <Squircle
            asChild
            cornerRadius={22}
            cornerSmoothing={1}
            defaultWidth={286}
            defaultHeight={66}
          >
            <button type="button" className="home-chair-preorder">
              <LetterCascade text="Pre-order now" autoIntervalMs={4200} />
            </button>
          </Squircle>
        </div>
      </section>

      <section
        ref={bestSellerRef}
        className="home-bestseller-section"
        aria-labelledby="home-bestseller-title"
      >
        <div ref={bestSellerHeaderRef} className="home-bestseller-backdrop" aria-hidden="true">
          <h2 id="home-bestseller-title">Best sellers</h2>
        </div>

        <div className="home-bestseller-content">
          <MotionDiv
            ref={bestSellerActionRef}
            className={`home-bestseller-action is-${bestSellerActionMode}`}
            animate={bestSellerActionControls}
            initial={false}
          >
            <Link to="/shop" className="pressable home-bestseller-view">
              View all
            </Link>
          </MotionDiv>

          <div className="home-bestseller-shell">
            <div className="home-bestseller-board">
              {productsLoading ? (
                <div className="home-bestseller-loading" aria-hidden="true">
                  {bestSellerSkeletonItems.map(item => (
                    <Skeleton className="home-bestseller-stack-skeleton" key={item} />
                  ))}
                </div>
              ) : bestSellerProducts.length > 0 ? (
                <div className="home-bestseller-grid">
                  {bestSellerProducts.map((product, index) => (
                    <BestSellerStackedProduct
                      key={product.id}
                      product={product}
                      index={index}
                      location={location}
                      onHoverLabelChange={setBestSellerHoverLabel}
                    />
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
        </div>
      </section>
      <BestSellerHoverLabel label={bestSellerHoverLabel} reduceMotion={reduceMotion} />
      <Footer />
    </div>
  )
}
