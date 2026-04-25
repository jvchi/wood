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

import { useEffect, useRef, useCallback, useLayoutEffect } from 'react'

/* ── module-level store (survives route changes) ── */
const _snapshots = {}
export const _returnSnapshots = {}

function getSnapshotRect(element) {
  const rect = element.getBoundingClientRect()
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

function getVisualTarget(element) {
  if (!element) return null
  if (element.tagName === 'IMG') return element
  return element.querySelector('img')
}

function createGhostImage(snapshot, targetRect, objectFit) {
  const ghost = document.createElement('img')
  ghost.src = snapshot.src
  ghost.setAttribute('aria-hidden', 'true')
  ghost.setAttribute('alt', '')
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${targetRect.left}px`,
    top: `${targetRect.top}px`,
    width: `${targetRect.width}px`,
    height: `${targetRect.height}px`,
    margin: '0',
    padding: '0',
    objectFit,
    zIndex: '9999',
    pointerEvents: 'none',
    outline: 'none',
    borderRadius: '0',
    transformOrigin: 'top left',
    willChange: 'transform, opacity',
  })
  return ghost
}

function runGhostTransition({
  snapshot,
  targetElement,
  targetRect,
  duration,
  easing,
  objectFit,
}) {
  const ghost = createGhostImage(snapshot, targetRect, objectFit)
  const deltaX = snapshot.left - targetRect.left
  const deltaY = snapshot.top - targetRect.top
  const scaleX = snapshot.width / targetRect.width
  const scaleY = snapshot.height / targetRect.height

  if (
    Math.abs(deltaX) < 2 &&
    Math.abs(deltaY) < 2 &&
    Math.abs(1 - scaleX) < 0.01 &&
    Math.abs(1 - scaleY) < 0.01
  ) {
    return null
  }

  const priorOpacity = targetElement.style.opacity
  targetElement.style.opacity = '0'
  document.body.appendChild(ghost)

  const ghostAnimation = ghost.animate(
    [
      {
        opacity: 1,
        transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`,
      },
      {
        opacity: 1,
        transform: 'translate(0px, 0px) scale(1, 1)',
      },
    ],
    {
      duration,
      easing,
      fill: 'forwards',
    },
  )

  const targetAnimation = targetElement.animate(
    [
      { opacity: 0 },
      { opacity: 0, offset: 0.7 },
      { opacity: 1 },
    ],
    {
      duration,
      easing: 'linear',
      fill: 'forwards',
    },
  )

  const cleanup = () => {
    targetElement.style.opacity = priorOpacity
    targetAnimation.cancel()
    ghost.remove()
  }

  ghostAnimation.onfinish = cleanup
  ghostAnimation.oncancel = cleanup

  return cleanup
}

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

  useLayoutEffect(() => {
    if (!enabled || hasAnimated.current) return
    const el = targetRef.current
    if (!el) return
    const targetImage = getVisualTarget(el)
    if (!targetImage) return

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

    const frame = requestAnimationFrame(() => {
      const targetRect = getSnapshotRect(targetImage)
      if (targetRect.width < 1 || targetRect.height < 1) return

      runGhostTransition({
        snapshot: snap,
        targetElement: targetImage,
        targetRect,
        duration,
        easing,
        objectFit: 'cover',
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [id, duration, easing, enabled])

  // Continuously track the element's position so we have a valid snapshot even if unmount zeroes it out
  useEffect(() => {
    const el = targetRef.current
    if (!el) return

    const updateSnapshot = () => {
      const img = getVisualTarget(el)
      const subject = img || el
      const rect = subject.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        _returnSnapshots[id] = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          src: img ? img.src : '',
          timestamp: Date.now(),
        }
      }
    }

    updateSnapshot()
    window.addEventListener('scroll', updateSnapshot, { passive: true })
    window.addEventListener('resize', updateSnapshot, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateSnapshot)
      window.removeEventListener('resize', updateSnapshot)
      updateSnapshot() // Final attempt on unmount
    }
  }, [id])

  return targetRef
}

/**
 * Hook: attach to the **product card image** on the shop page.
 * When the component mounts, it checks for a return snapshot and runs
 * a ghost-overlay FLIP animation from the product page position to the
 * card position.
 */
export function useSharedReturnTransition(id, options = {}) {
  const targetRef = useRef(null)
  const hasAnimated = useRef(false)

  const {
    duration = DEFAULT_DURATION,
    easing = DEFAULT_EASING,
    enabled = true,
    ready = true,
  } = options

  useLayoutEffect(() => {
    if (!enabled || !ready || hasAnimated.current) return
    const el = targetRef.current
    if (!el) return

    const snap = _returnSnapshots[id]
    if (!snap || Date.now() - snap.timestamp > 2000) {
      return
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (prefersReducedMotion) {
      delete _returnSnapshots[id]
      return
    }

    hasAnimated.current = true
    delete _returnSnapshots[id]

    const frame = requestAnimationFrame(() => {
      const targetRect = getSnapshotRect(el)
      if (targetRect.width < 1 || targetRect.height < 1) return

      runGhostTransition({
        snapshot: {
          ...snap,
          src: snap.src || el.src,
        },
        targetElement: el,
        targetRect,
        duration,
        easing,
        objectFit: 'cover',
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [id, duration, easing, enabled, ready])

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
