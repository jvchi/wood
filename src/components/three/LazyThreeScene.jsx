import { Suspense, useEffect, useState } from 'react'
import ThreeModelPlaceholder from './ThreeModelPlaceholder'
import { getDevicePerformanceProfile, runWhenIdle } from '../../lib/threeAssetStrategy'

export default function LazyThreeScene({
  children,
  fallback,
  poster,
  label,
  variant,
  disabled = false,
  idleTimeout = 1200,
}) {
  const [ready, setReady] = useState(false)
  const [profile] = useState(getDevicePerformanceProfile)

  useEffect(() => {
    if (disabled || profile.preferStatic) return undefined
    return runWhenIdle(() => setReady(true), idleTimeout)
  }, [disabled, idleTimeout, profile.preferStatic])

  if (disabled || profile.preferStatic || !ready) {
    return fallback || <ThreeModelPlaceholder poster={poster} label={label} variant={variant} />
  }

  return (
    <Suspense fallback={fallback || <ThreeModelPlaceholder poster={poster} label={label} variant={variant} />}>
      {children}
    </Suspense>
  )
}
