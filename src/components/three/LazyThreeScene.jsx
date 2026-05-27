import { Suspense, useEffect, useState } from 'react'
import ThreeModelPlaceholder from './ThreeModelPlaceholder'
import { runWhenIdle } from '../../lib/threeAssetStrategy'

const readyScenes = new Set()

export default function LazyThreeScene({
  children,
  fallback,
  poster,
  label,
  variant,
  cacheKey = `${variant || 'scene'}:${label || '3d'}`,
  disabled = false,
  idleTimeout = 1200,
}) {
  const [ready, setReady] = useState(() => idleTimeout <= 0 || readyScenes.has(cacheKey))
  const resolvedFallback = fallback !== undefined
    ? fallback
    : <ThreeModelPlaceholder poster={poster} label={label} variant={variant} />

  useEffect(() => {
    if (idleTimeout <= 0) {
      readyScenes.add(cacheKey)
      return undefined
    }
    if (disabled || readyScenes.has(cacheKey)) return undefined
    return runWhenIdle(() => {
      readyScenes.add(cacheKey)
      setReady(true)
    }, idleTimeout)
  }, [cacheKey, disabled, idleTimeout])

  if (disabled || !ready) {
    return resolvedFallback
  }

  return (
    <Suspense fallback={resolvedFallback}>
      {children}
    </Suspense>
  )
}
