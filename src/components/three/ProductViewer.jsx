import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Center, useGLTF } from '@react-three/drei'
import Couch from '../../../components/Couch'
import ThreeModelPlaceholder from './ThreeModelPlaceholder'
import LoadingSpinner from '../ui/LoadingSpinner'
import { canUseWebGL, getDevicePerformanceProfile, resolveModelAsset } from '../../lib/threeAssetStrategy'

function AutoRotate({ enabled }) {
  const controls = useRef()

  useFrame(() => {
    if (controls.current && enabled) {
      controls.current.autoRotate = true
      controls.current.autoRotateSpeed = 1.5
      controls.current.update()
    }
  })

  return (
    <OrbitControls
      ref={controls}
      enableZoom={false}
      enablePan={false}
      autoRotate={enabled}
      autoRotateSpeed={1.5}
      onStart={() => {
        if (controls.current) {
          controls.current.autoRotate = false
        }
      }}
    />
  )
}

function UploadedProductModel({ url, scale = 1, rotation = '0,0,0', onReady }) {
  const { scene } = useGLTF(url)
  const [x = 0, y = 0, z = 0] = String(rotation).split(',').map(Number)

  useEffect(() => {
    onReady?.()
  }, [onReady, url])

  return <primitive object={scene} scale={Number(scale) || 1} rotation={[x, y, z]} />
}

export default function ProductViewer({
  modelUrl,
  modelLiteUrl,
  modelVersion,
  modelScale,
  modelRotation,
  fallbackImage,
  active = true,
}) {
  const [autoRotate, setAutoRotate] = useState(true)
  const [loadedModelUrl, setLoadedModelUrl] = useState(null)
  const [webglAvailable] = useState(canUseWebGL)
  const [profile] = useState(getDevicePerformanceProfile)
  const resolvedModel = modelUrl
    ? resolveModelAsset(
      { src: modelUrl, liteSrc: modelLiteUrl, poster: fallbackImage, version: modelVersion },
      { quality: profile.preferLite ? 'lite' : 'full' },
    )
    : null
  const isUploadedModel = Boolean(resolvedModel?.src)
  const modelReady = !isUploadedModel || loadedModelUrl === resolvedModel?.src

  if (!webglAvailable || profile.preferStatic) {
    return (
      <div className="h-full min-h-[400px] w-full bg-[var(--color-surface)]">
        <ThreeModelPlaceholder poster={fallbackImage} variant="product" label="Product preview" spinner={false} />
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-[400px] w-full bg-[var(--color-surface)]">
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [3, 1, 3], fov: 40 }}
        dpr={[1, profile.dpr]}
        frameloop={active ? 'always' : 'demand'}
        gl={{ antialias: profile.tier === 'high', powerPreference: profile.tier === 'high' ? 'high-performance' : 'default' }}
        onPointerDown={() => setAutoRotate(false)}
        onPointerUp={() => {
          setTimeout(() => setAutoRotate(true), 3000)
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 3]} intensity={0.7} />
        <AutoRotate enabled={autoRotate} />
        <Center>
          {isUploadedModel ? (
            <Suspense fallback={null}>
              <UploadedProductModel
                url={resolvedModel.src}
                scale={modelScale}
                rotation={modelRotation}
                onReady={() => setLoadedModelUrl(resolvedModel.src)}
              />
            </Suspense>
          ) : (
            <Couch />
          )}
        </Center>
      </Canvas>
      {!modelReady && (
        <LoadingSpinner className="model-loading-overlay" label="Loading product model" size={150} />
      )}
    </div>
  )
}
