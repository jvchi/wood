import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import ThreeModelPlaceholder from '../three/ThreeModelPlaceholder'
import LoadingSpinner from '../ui/LoadingSpinner'
import UploadedProductModel from '../three/UploadedProductModel'
import ErrorBoundary from '../ui/ErrorBoundary'
import { canUseWebGL, getDevicePerformanceProfile, resolveModelAsset } from '../../lib/threeAssetStrategy'

const MODEL_LOAD_TIMEOUT_MS = 10000

function ModelLoadFallback({ onError }) {
  useEffect(() => {
    onError?.()
  }, [onError])

  return null
}

export default function ProductModelPreview({ modelUrl, fallbackImage, scale, rotation }) {
  const [failedModelUrl, setFailedModelUrl] = useState(null)
  const [loadedModelUrl, setLoadedModelUrl] = useState(null)
  const [webglAvailable] = useState(canUseWebGL)
  const [profile] = useState(getDevicePerformanceProfile)
  const resolvedModel = modelUrl ? resolveModelAsset({ src: modelUrl, poster: fallbackImage }) : null
  const resolvedModelSrc = resolvedModel?.src
  const modelReady = loadedModelUrl === resolvedModelSrc
  const failed = failedModelUrl === resolvedModelSrc

  useEffect(() => {
    if (!resolvedModelSrc || modelReady || failed) return undefined

    const timer = window.setTimeout(() => {
      setFailedModelUrl(resolvedModelSrc)
    }, MODEL_LOAD_TIMEOUT_MS)

    return () => window.clearTimeout(timer)
  }, [failed, modelReady, resolvedModelSrc])

  if (!resolvedModel?.src || failed || !webglAvailable || profile.preferStatic) {
    return (
      <div className="admin-model-fallback">
        {fallbackImage ? <img src={fallbackImage} alt="" /> : <ThreeModelPlaceholder variant="product" label="No 3D model" spinner={false} />}
      </div>
    )
  }

  return (
    <div className="admin-model-preview">
      <Canvas
        camera={{ position: [3, 1.5, 3], fov: 42 }}
        dpr={[1, profile.dpr]}
        gl={{ antialias: profile.tier === 'high', powerPreference: profile.tier === 'high' ? 'high-performance' : 'default' }}
        onError={() => setFailedModelUrl(resolvedModelSrc)}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 4, 3]} intensity={0.9} />
        <ErrorBoundary
          key={resolvedModelSrc}
          fallback={<ModelLoadFallback onError={() => setFailedModelUrl(resolvedModelSrc)} />}
        >
          <Suspense fallback={null}>
            <UploadedProductModel
              url={resolvedModelSrc}
              scale={scale}
              rotation={rotation}
              onReady={() => setLoadedModelUrl(resolvedModelSrc)}
            />
          </Suspense>
        </ErrorBoundary>
        <OrbitControls enablePan={false} />
      </Canvas>
      {!modelReady && (
        <LoadingSpinner className="model-loading-overlay" label="Loading product model" />
      )}
    </div>
  )
}
