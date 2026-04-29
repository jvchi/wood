import { useEffect, useMemo, useState } from 'react'
import { routeLoaders } from '../lib/routePreload'
import { MODEL_ASSETS, getDevicePerformanceProfile, resolveModelAsset } from '../lib/threeAssetStrategy'

const MIN_HOLD_MS = 700
const MAX_HOLD_MS = 3200
const IMAGE_WAIT_MS = 1800

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
  return withTimeout(Promise.all(images.map(waitForImage)), IMAGE_WAIT_MS)
}

function preloadHomeHeroAsset() {
  const profile = getDevicePerformanceProfile()

  if (profile.preferStatic && MODEL_ASSETS.room.poster) {
    const image = new Image()
    image.decoding = 'async'
    image.src = resolveModelAsset(MODEL_ASSETS.room).poster
    return withTimeout(waitForImage(image), IMAGE_WAIT_MS)
  }

  const asset = resolveModelAsset(MODEL_ASSETS.room, {
    quality: profile.preferLite ? 'lite' : 'full',
  })

  if (!asset.src) return Promise.resolve()

  return withTimeout(fetch(asset.src, { cache: 'force-cache' }).catch(() => undefined), IMAGE_WAIT_MS)
}

function routeKeyFromPathname(pathname) {
  if (pathname === '/') return '/'
  if (pathname.startsWith('/product/')) return '/product'
  if (pathname.startsWith('/admin/products')) return '/admin/products'
  if (pathname.startsWith('/admin/taxonomy')) return '/admin/taxonomy'
  if (pathname.startsWith('/admin')) return '/admin'
  return routeLoaders[pathname] ? pathname : '*'
}

export default function useInitialLoadReady(pathname) {
  const [ready, setReady] = useState(false)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    const startedAt = performance.now()
    let cancelled = false
    const routeKey = routeKeyFromPathname(pathname)
    const routeLoader = routeLoaders[routeKey]

    document.documentElement.classList.add('intro-lock')

    async function waitForInitialView() {
      await withTimeout(Promise.all([
        waitForFonts(),
        routeLoader?.(),
        routeKey === '/' ? preloadHomeHeroAsset() : undefined,
      ]), MAX_HOLD_MS)

      await new Promise((resolve) => window.requestAnimationFrame(() => resolve()))
      await waitForCriticalImages()

      const elapsed = performance.now() - startedAt
      if (elapsed < MIN_HOLD_MS) {
        await new Promise((resolve) => window.setTimeout(resolve, MIN_HOLD_MS - elapsed))
      }

      if (!cancelled) {
        setReady(true)
      }
    }

    const hardTimeout = window.setTimeout(() => {
      if (!cancelled) setReady(true)
    }, MAX_HOLD_MS)

    waitForInitialView()

    return () => {
      cancelled = true
      window.clearTimeout(hardTimeout)
      document.documentElement.classList.remove('intro-lock')
    }
  }, [pathname])

  useEffect(() => {
    if (!ready || complete) return undefined

    const timer = window.setTimeout(() => {
      setComplete(true)
    }, 1100)

    return () => window.clearTimeout(timer)
  }, [ready, complete])

  useEffect(() => {
    if (!complete) return
    document.documentElement.classList.remove('intro-lock')
  }, [complete])

  return useMemo(() => ({ ready, complete, setComplete }), [ready, complete])
}
