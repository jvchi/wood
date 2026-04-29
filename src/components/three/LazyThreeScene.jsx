import { Suspense, useEffect, useState } from 'react'
import ThreeModelPlaceholder from './ThreeModelPlaceholder'
import { getDevicePerformanceProfile, runWhenIdle } from '../../lib/threeAssetStrategy'

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
  const [ready, setReady] = useState(() => readyScenes.has(cacheKey))
  const [profile] = useState(getDevicePerformanceProfile)

  useEffect(() => {
    if (disabled || profile.preferStatic || readyScenes.has(cacheKey)) return undefined
    return runWhenIdle(() => {
      readyScenes.add(cacheKey)
      setReady(true)
    }, idleTimeout)
  }, [cacheKey, disabled, idleTimeout, profile.preferStatic])

  if (disabled || profile.preferStatic || !ready) {
    return fallback || <ThreeModelPlaceholder poster={poster} label={label} variant={variant} />
  }

  return (
    <Suspense fallback={fallback || <ThreeModelPlaceholder poster={poster} label={label} variant={variant} />}>
      {children}
    </Suspense>
  )
}
