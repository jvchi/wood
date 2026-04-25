import { useLayoutEffect, useRef } from 'react'

const DEFAULT_OPTIONS = {
  duration: 360,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
}

export function useSharedLayoutTransition(layoutId, activeKey, enabled = true, options = DEFAULT_OPTIONS) {
  const previousRect = useRef(null)

  useLayoutEffect(() => {
    if (!enabled || typeof document === 'undefined') return undefined

    const activeElement = document.querySelector(
      `[data-shared-layout-id="${layoutId}"][data-shared-layout-active="true"]`,
    )

    if (!activeElement) return undefined

    const nextRect = activeElement.getBoundingClientRect()
    const prevRect = previousRect.current

    if (prevRect) {
      const deltaX = prevRect.left - nextRect.left
      const deltaY = prevRect.top - nextRect.top
      const scaleX = prevRect.width / Math.max(nextRect.width, 1)
      const scaleY = prevRect.height / Math.max(nextRect.height, 1)
      const moved = Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1 || Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01

      if (moved && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        activeElement.animate(
          [
            {
              transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`,
              transformOrigin: 'top left',
            },
            {
              transform: 'translate3d(0, 0, 0) scale(1, 1)',
              transformOrigin: 'top left',
            },
          ],
          {
            duration: options.duration,
            easing: options.easing,
          },
        )
      }
    }

    previousRect.current = nextRect
    return undefined
  }, [layoutId, activeKey, enabled, options.duration, options.easing])
}
