import { AnimatePresence, motion as framerMotion, useReducedMotion } from 'framer-motion'

const MotionDiv = framerMotion.div
const MotionSpan = framerMotion.span

const brandLayoutTransition = {
  layout: {
    type: 'spring',
    stiffness: 560,
    damping: 42,
    mass: 0.82,
  },
}

export default function InitialLoadTransition({
  ready,
  onExitComplete,
  onCoverEnterComplete,
  showProgress = false,
  variant = 'default',
}) {
  const reducedMotion = useReducedMotion()
  const loaderEase = [0.22, 1, 0.36, 1]
  const isFirstLoad = showProgress
  const panelEnterTransition = reducedMotion
    ? { duration: 0.12, ease: loaderEase }
    : { type: 'spring', stiffness: 780, damping: 58, mass: 0.72 }
  const panelExitTransition = {
    duration: reducedMotion ? 0.12 : 0.52,
    ease: [0.32, 0.72, 0, 1],
  }

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {!ready && (
        <MotionDiv
          key="initial-loader"
          className={`initial-loader initial-loader-${variant}`}
          role="status"
          aria-label="Loading"
          initial={{ opacity: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: reducedMotion ? 0.16 : 0.32, ease: loaderEase }}
        >
          <MotionDiv
            className="initial-loader-panel initial-loader-panel-top"
            initial={reducedMotion || isFirstLoad ? { y: 0 } : { y: '-101%' }}
            animate={{ y: 0, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { y: '-101%' }}
            transition={ready ? panelExitTransition : panelEnterTransition}
            onAnimationComplete={() => {
              if (!ready && !isFirstLoad) onCoverEnterComplete?.()
            }}
          />
          <MotionDiv
            className="initial-loader-panel initial-loader-panel-bottom"
            initial={reducedMotion || isFirstLoad ? { y: 0 } : { y: '101%' }}
            animate={{ y: 0, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { y: '101%' }}
            transition={ready ? panelExitTransition : panelEnterTransition}
          />
          <MotionDiv
            className="initial-loader-mark"
            initial={reducedMotion ? false : { opacity: isFirstLoad ? 0 : 0, filter: 'blur(5px)', scale: isFirstLoad ? 0.985 : 0.975 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, filter: 'blur(0px)', scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 1, filter: 'blur(0px)', scale: 1 }}
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
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, filter: 'blur(0px)', y: 0, scaleX: 1 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(8px)', y: 4, scaleX: 0.98 }}
                transition={{ duration: 0.24, ease: loaderEase }}
              >
                <span />
              </MotionDiv>
            )}
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  )
}
