/**
 * Shared hero transition — manual FLIP for cross-route product image animation.
 *
 * How it works:
 * 1. On the shop page, when a card is clicked we snapshot the image's bounding rect
 *    and src into a module-level store keyed by product id.
 * 2. On the product page, the gallery frame mounts and we run a ghost-based FLIP
 *    animation from the source rect to the gallery frame's rect.
 *
 * This deliberately avoids wrapping routes in AnimatePresence/LayoutGroup which
 * breaks category-filter transitions and other layout animations.
 */

import { useEffect, useRef, useCallback } from 'react'

/* ── module-level store (survives route changes) ── */
const _snapshots = {}

/**
 * Call from the source page: captures the rect + src of the given image element.
 */
export function captureElement(id, element) {
  if (!element) return false
  const rect = element.getBoundingClientRect()
  _snapshots[id] = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    src: element.src || element.querySelector?.('img')?.src || '',
    timestamp: Date.now(),
  }
  return true
}

/* ── default animation config ── */
const DEFAULT_DURATION = 480
const DEFAULT_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

/**
 * Hook: attach to the **gallery frame container** on the product page.
 * When the component mounts, it checks for a stored snapshot and runs
 * a ghost-overlay FLIP animation from the shop card position to the
 * gallery frame position.
 *
 * @param {string} id - the snapshot key (product id)
 * @param {object} [options]
 * @param {number} [options.duration=480]
 * @param {string} [options.easing]
 * @param {boolean} [options.enabled=true]
 */
export function useSharedHeroTransition(id, options = {}) {
  const targetRef = useRef(null)
  const hasAnimated = useRef(false)

  const {
    duration = DEFAULT_DURATION,
    easing = DEFAULT_EASING,
    enabled = true,
  } = options

  useEffect(() => {
    if (!enabled || hasAnimated.current) return
    const el = targetRef.current
    if (!el) return

    const snap = _snapshots[id]
    if (!snap || Date.now() - snap.timestamp > 2000) {
      return
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (prefersReducedMotion) {
      delete _snapshots[id]
      return
    }

    hasAnimated.current = true
    delete _snapshots[id]

    // Defer to next frame so the gallery frame has its final layout
    requestAnimationFrame(() => {
      const targetRect = el.getBoundingClientRect()
      if (targetRect.width < 1 || targetRect.height < 1) return

      const deltaX = snap.left - targetRect.left
      const deltaY = snap.top - targetRect.top
      const scaleX = snap.width / targetRect.width
      const scaleY = snap.height / targetRect.height

      // Skip if barely moved
      if (
        Math.abs(deltaX) < 2 &&
        Math.abs(deltaY) < 2 &&
        Math.abs(1 - scaleX) < 0.01 &&
        Math.abs(1 - scaleY) < 0.01
      ) {
        return
      }

      // Build a ghost image that flies from source → target
      const ghost = document.createElement('img')
      ghost.src = snap.src
      ghost.setAttribute('aria-hidden', 'true')
      ghost.setAttribute('alt', '')
      Object.assign(ghost.style, {
        position: 'fixed',
        left: `${snap.left}px`,
        top: `${snap.top}px`,
        width: `${snap.width}px`,
        height: `${snap.height}px`,
        margin: '0',
        padding: '0',
        objectFit: 'cover',
        zIndex: '9999',
        pointerEvents: 'none',
        outline: 'none',
        borderRadius: '0',
        willChange: 'left, top, width, height',
      })

      // Dim the gallery frame during animation so there's no flash
      const priorOpacity = el.style.opacity
      el.style.opacity = '0'
      document.body.appendChild(ghost)

      const animation = ghost.animate(
        [
          {
            left: `${snap.left}px`,
            top: `${snap.top}px`,
            width: `${snap.width}px`,
            height: `${snap.height}px`,
            objectFit: 'cover',
          },
          {
            left: `${targetRect.left}px`,
            top: `${targetRect.top}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            objectFit: 'contain',
          },
        ],
        {
          duration,
          easing,
          fill: 'forwards',
        },
      )

      const cleanup = () => {
        el.style.opacity = priorOpacity
        ghost.remove()
      }

      animation.onfinish = cleanup
      animation.oncancel = cleanup
    })
  }, [id, duration, easing, enabled])

  return targetRef
}

/**
 * Helper to create an onClick handler that captures the element rect before navigating.
 * Use on the source image/card.
 */
export function useCaptureBeforeNav(id) {
  const sourceRef = useRef(null)

  const captureAndNavigate = useCallback(
    (navigateFn) => {
      if (sourceRef.current) {
        captureElement(id, sourceRef.current)
      }
      navigateFn()
    },
    [id],
  )

  return { sourceRef, captureAndNavigate }
}
