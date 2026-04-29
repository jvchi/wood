import { AnimatePresence, motion as framerMotion, useReducedMotion } from 'framer-motion'

const MotionDiv = framerMotion.div
const MotionSpan = framerMotion.span

export default function InitialLoadTransition({ ready, onExitComplete }) {
  const reducedMotion = useReducedMotion()

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {!ready && (
        <MotionDiv
          key="initial-loader"
          className="initial-loader"
          role="status"
          aria-label="Loading"
          initial={{ opacity: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: reducedMotion ? 0.16 : 0.42, ease: [0.32, 0.72, 0, 1] }}
        >
          <MotionDiv
            className="initial-loader-panel initial-loader-panel-top"
            exit={reducedMotion ? { opacity: 0 } : { y: '-101%' }}
            transition={{ duration: 0.76, ease: [0.32, 0.72, 0, 1] }}
          />
          <MotionDiv
            className="initial-loader-panel initial-loader-panel-bottom"
            exit={reducedMotion ? { opacity: 0 } : { y: '101%' }}
            transition={{ duration: 0.76, ease: [0.32, 0.72, 0, 1] }}
          />
          <MotionSpan
            layoutId="brand-wordmark"
            className="initial-loader-wordmark"
            transition={{ layout: { duration: 0.72, ease: [0.32, 0.72, 0, 1] } }}
          >
            wood
          </MotionSpan>
        </MotionDiv>
      )}
    </AnimatePresence>
  )
}
