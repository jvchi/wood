import { useLayoutEffect, useRef } from 'react'

const DEFAULT_OPTIONS = {
  duration: 360,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
}

export function useSharedLayoutTransition(layoutId, activeKey, enabled = true, options = DEFAULT_OPTIONS) {
  const previousRect = useRef(null)
  const animationRef = useRef(null)

  useLayoutEffect(() => {
    if (!enabled || typeof document === 'undefined') return undefined

    const activeElement = document.querySelector(
      `[data-shared-layout-id="${layoutId}"][data-shared-layout-active="true"]`,
    )

    if (!activeElement) return undefined

    const nextRect = activeElement.getBoundingClientRect()
    const prevRect = previousRect.current
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prevRect) {
      const moved =
        Math.abs(prevRect.left - nextRect.left) > 1 ||
        Math.abs(prevRect.top - nextRect.top) > 1 ||
        Math.abs(prevRect.width - nextRect.width) > 1 ||
        Math.abs(prevRect.height - nextRect.height) > 1

      if (moved && !prefersReducedMotion) {
        animationRef.current?.cancel()

        const ghost = activeElement.cloneNode(true)
        const priorVisibility = activeElement.style.visibility

        ghost.setAttribute('aria-hidden', 'true')
        ghost.removeAttribute('data-shared-layout-active')
        ghost.classList.add('shared-layout-ghost')
        Object.assign(ghost.style, {
          position: 'fixed',
          left: `${prevRect.left}px`,
          top: `${prevRect.top}px`,
          width: `${prevRect.width}px`,
          height: `${prevRect.height}px`,
          margin: '0',
          translate: 'none',
          transform: 'none',
          transformOrigin: 'top left',
          pointerEvents: 'none',
          visibility: 'visible',
          opacity: '1',
          zIndex: '70',
        })

        activeElement.style.visibility = 'hidden'
        document.body.appendChild(ghost)

        const animation = ghost.animate(
          [
            {
              left: `${prevRect.left}px`,
              top: `${prevRect.top}px`,
              width: `${prevRect.width}px`,
              height: `${prevRect.height}px`,
            },
            {
              left: `${nextRect.left}px`,
              top: `${nextRect.top}px`,
              width: `${nextRect.width}px`,
              height: `${nextRect.height}px`,
            },
          ],
          {
            duration: options.duration,
            easing: options.easing,
            fill: 'both',
          },
        )

        animationRef.current = animation
        animation.onfinish = () => {
          activeElement.style.visibility = priorVisibility
          ghost.remove()
          if (animationRef.current === animation) animationRef.current = null
        }
        animation.oncancel = () => {
          activeElement.style.visibility = priorVisibility
          ghost.remove()
          if (animationRef.current === animation) animationRef.current = null
        }
      }
    }

    previousRect.current = nextRect
    return () => {
      animationRef.current?.cancel()
    }
  }, [layoutId, activeKey, enabled, options.duration, options.easing])
}
