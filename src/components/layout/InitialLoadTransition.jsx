import { motion as framerMotion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { loaderMotion } from '../../lib/transitionConfig'

const MotionDiv = framerMotion.div
const MotionSpan = framerMotion.span

const brandLayoutTransition = loaderMotion.brandLayout

export default function InitialLoadTransition({
  ready,
  onExitComplete,
  onCoverEnterComplete,
  showProgress = false,
  variant = 'default',
}) {
  const reducedMotion = useReducedMotion()
  const coverEnteredRef = useRef(false)
  const exitCompleteRef = useRef(false)
  const loaderEase = loaderMotion.ease
  const isFirstLoad = showProgress
  const panelEnterTransition = reducedMotion
    ? { ...loaderMotion.panelEnter.reduced, ease: loaderEase }
    : loaderMotion.panelEnter.spring
  const panelExitTransition = {
    duration: reducedMotion ? loaderMotion.panelExit.reducedDuration : loaderMotion.panelExit.duration,
    ease: loaderMotion.panelExit.ease,
  }

  useEffect(() => {
    if (!ready) exitCompleteRef.current = false
  }, [ready])

  function handleCoverEntered() {
    if (ready || coverEnteredRef.current) return
    coverEnteredRef.current = true
    onCoverEnterComplete?.()
  }

  function handleExitComplete() {
    if (!ready || exitCompleteRef.current) return
    exitCompleteRef.current = true
    onExitComplete?.()
  }

  return (
    <MotionDiv
      className={`initial-loader initial-loader-${variant}`}
      role="status"
      aria-label="Loading"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0.16 : 0.32, ease: loaderEase }}
    >
      <MotionDiv
        className="initial-loader-panel initial-loader-panel-top"
        initial={reducedMotion || isFirstLoad ? { y: 0 } : { y: '-101%' }}
        animate={reducedMotion && ready ? { opacity: 0 } : { y: ready ? '-101%' : 0, opacity: 1 }}
        transition={ready ? panelExitTransition : panelEnterTransition}
        onAnimationComplete={() => {
          handleCoverEntered()
          handleExitComplete()
        }}
      />
      <MotionDiv
        className="initial-loader-panel initial-loader-panel-bottom"
        initial={reducedMotion || isFirstLoad ? { y: 0 } : { y: '101%' }}
        animate={reducedMotion && ready ? { opacity: 0 } : { y: ready ? '101%' : 0, opacity: 1 }}
        transition={ready ? panelExitTransition : panelEnterTransition}
      />
      <MotionDiv
        className="initial-loader-mark"
        initial={reducedMotion ? false : { opacity: 0, filter: 'blur(5px)', scale: isFirstLoad ? 0.985 : 0.975 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, filter: 'blur(0px)', scale: ready ? 0.995 : 1 }}
        transition={{ duration: isFirstLoad ? 0.42 : 0.24, ease: loaderEase, delay: isFirstLoad ? 0 : 0.05 }}
      >
        <MotionSpan
          layoutId="brand-wordmark"
          className="initial-loader-wordmark"
          transition={brandLayoutTransition}
        >
          wood
        </MotionSpan>
        {showProgress && (
          <MotionDiv
            className="initial-loader-progress"
            aria-hidden="true"
            initial={reducedMotion ? false : { opacity: 0, filter: 'blur(4px)', y: 5, scaleX: 0.94 }}
            animate={reducedMotion
              ? { opacity: ready ? 0 : 1 }
              : { opacity: ready ? 0 : 1, filter: ready ? 'blur(8px)' : 'blur(0px)', y: ready ? 4 : 0, scaleX: ready ? 0.98 : 1 }}
            transition={{ duration: 0.24, ease: loaderEase }}
          >
            <span />
          </MotionDiv>
        )}
      </MotionDiv>
    </MotionDiv>
  )
}
