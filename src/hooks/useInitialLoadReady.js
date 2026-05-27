import { useEffect, useMemo, useState } from 'react'
import { preloadRouteForPath, routeLoaders } from '../lib/routePreload'
import { routeTransitionTiming } from '../lib/transitionConfig'
import { MODEL_ASSETS, getDevicePerformanceProfile, resolveModelAsset } from '../lib/threeAssetStrategy'

const { minHoldMs, maxHoldMs, imageWaitMs, completeDelayMs } = routeTransitionTiming

function withTimeout(promise, timeout) {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, timeout)

    Promise.resolve(promise)
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(timer)
        resolve()
      })
  })
}

function waitForFonts() {
  if (!document.fonts?.ready) return Promise.resolve()
  return document.fonts.ready.catch(() => undefined)
}

function waitForImage(image) {
  if (!image || image.complete) return Promise.resolve()

  return new Promise((resolve) => {
    const done = () => {
      image.removeEventListener('load', done)
      image.removeEventListener('error', done)
      resolve()
    }

    image.addEventListener('load', done, { once: true })
    image.addEventListener('error', done, { once: true })
  })
}

function waitForCriticalImages() {
  const images = Array.from(document.querySelectorAll([
    'img[data-critical="true"]',
    'img[loading="eager"]',
    '.home-couch-frame img',
    '.home-couch-stage img',
  ].join(',')))

  if (!images.length) return Promise.resolve()
  return withTimeout(Promise.all(images.map(waitForImage)), imageWaitMs)
}

function preloadHomeHeroAsset() {
  const profile = getDevicePerformanceProfile()

  if (profile.preferStatic && MODEL_ASSETS.room.poster) {
    const image = new Image()
    image.decoding = 'async'
    image.src = resolveModelAsset(MODEL_ASSETS.room).poster
    return withTimeout(waitForImage(image), imageWaitMs)
  }

  const asset = resolveModelAsset(MODEL_ASSETS.room, {
    quality: profile.preferLite ? 'lite' : 'full',
  })

  if (!asset.src) return Promise.resolve()

  return withTimeout(fetch(asset.src, { cache: 'force-cache' }).catch(() => undefined), imageWaitMs)
}

function waitForHomeScenes() {
  if (
    document.documentElement.dataset.homeHeroReady === 'true' &&
    document.documentElement.dataset.homeChairReady === 'true'
  ) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const done = () => {
      window.removeEventListener('wood:home-scenes-ready', done)
      resolve()
    }

    window.addEventListener('wood:home-scenes-ready', done)
  })
}

function routeKeyFromPathname(pathname) {
  if (pathname === '/') return '/'
  if (pathname.startsWith('/product/')) return '/product'
  if (pathname.startsWith('/admin/products')) return '/admin/products'
  if (pathname.startsWith('/admin/taxonomy')) return '/admin/taxonomy'
  if (pathname.startsWith('/admin')) return '/admin'
  return routeLoaders[pathname] ? pathname : '*'
}

export default function useInitialLoadReady(pathname, { enabled = true } = {}) {
  const [readyPath, setReadyPath] = useState(null)
  const [completePath, setCompletePath] = useState(null)
  const ready = !enabled || readyPath === pathname
  const complete = !enabled || completePath === pathname

  useEffect(() => {
    if (!enabled) {
      document.documentElement.classList.remove('intro-lock')
      return undefined
    }

    const startedAt = performance.now()
    let cancelled = false
    const routeKey = routeKeyFromPathname(pathname)
    const routeLoader = routeLoaders[routeKey]

    document.documentElement.classList.add('intro-lock')
    if (routeKey === '/') {
      delete document.documentElement.dataset.homeHeroReady
      delete document.documentElement.dataset.homeChairReady
    }

    async function waitForInitialView() {
      await withTimeout(Promise.all([
        waitForFonts(),
        preloadRouteForPath(pathname) || routeLoader?.(),
        routeKey === '/' ? preloadHomeHeroAsset() : undefined,
      ]), maxHoldMs)

      if (routeKey === '/') {
        await waitForHomeScenes()
      }

      await new Promise((resolve) => window.requestAnimationFrame(() => resolve()))
      await waitForCriticalImages()

      const elapsed = performance.now() - startedAt
      if (elapsed < minHoldMs) {
        await new Promise((resolve) => window.setTimeout(resolve, minHoldMs - elapsed))
      }

      if (!cancelled) {
        setReadyPath(pathname)
      }
    }

    const hardTimeout = routeKey === '/'
      ? undefined
      : window.setTimeout(() => {
        if (!cancelled) setReadyPath(pathname)
      }, maxHoldMs)

    waitForInitialView()

    return () => {
      cancelled = true
      if (hardTimeout) window.clearTimeout(hardTimeout)
      document.documentElement.classList.remove('intro-lock')
    }
  }, [enabled, pathname])

  useEffect(() => {
    if (!enabled || !ready || complete) return undefined

    const timer = window.setTimeout(() => {
      setCompletePath(pathname)
    }, completeDelayMs)

    return () => window.clearTimeout(timer)
  }, [enabled, ready, complete, pathname])

  useEffect(() => {
    if (!enabled || !complete) return
    document.documentElement.classList.remove('intro-lock')
  }, [enabled, complete])

  const setComplete = useMemo(() => (value) => {
    setCompletePath(value ? pathname : null)
  }, [pathname])

  return useMemo(() => ({ ready, complete, setComplete }), [ready, complete, setComplete])
}
