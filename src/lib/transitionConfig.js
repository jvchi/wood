export const routeTransitionTiming = {
  minHoldMs: 700,
  maxHoldMs: 3200,
  imageWaitMs: 1800,
  completeDelayMs: 1100,
}

export const loaderMotion = {
  ease: [0.22, 1, 0.36, 1],
  panelEnter: {
    spring: { type: 'spring', stiffness: 780, damping: 58, mass: 0.72 },
    reduced: { duration: 0.12 },
  },
  panelExit: {
    duration: 0.52,
    reducedDuration: 0.12,
    ease: [0.32, 0.72, 0, 1],
  },
  brandLayout: {
    layout: {
      type: 'spring',
      stiffness: 560,
      damping: 42,
      mass: 0.82,
    },
  },
}
