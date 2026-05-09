import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Center } from '@react-three/drei'
import { ACESFilmicToneMapping, SRGBColorSpace, PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import Couch from '../../../components/Couch'
import ThreeModelPlaceholder from './ThreeModelPlaceholder'
import LoadingSpinner from '../ui/LoadingSpinner'
import UploadedProductModel from './UploadedProductModel'
import ErrorBoundary from '../ui/ErrorBoundary'
import { canUseWebGL, getDevicePerformanceProfile, resolveModelAsset } from '../../lib/threeAssetStrategy'
import { parseCameraCsv } from '../../lib/modelCamera'

const MODEL_LOAD_TIMEOUT_MS = 10000

function AutoRotate({ enabled, target }) {
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
      target={target}
      onStart={() => {
        if (controls.current) {
          controls.current.autoRotate = false
        }
      }}
    />
  )
}

// Bakes three's built-in RoomEnvironment as scene.environment so PBR
// materials have something to reflect — without this metallic / low-roughness
// surfaces render near-black. RoomEnvironment ships with three so there's
// no network fetch and Suspense never blocks.
function SceneEnvironment() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const rt = pmrem.fromScene(room, 0.04)
    const prev = scene.environment
    scene.environment = rt.texture
    return () => {
      scene.environment = prev
      rt.dispose()
      pmrem.dispose()
      room.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach(m => m.dispose())
        }
      })
    }
  }, [gl, scene])
  return null
}

function ProductModelLoadFallback({ onError }) {
  useEffect(() => {
    onError?.()
  }, [onError])

  return null
}

export default function ProductViewer({
  modelUrl,
  modelLiteUrl,
  modelVersion,
  modelScale,
  modelRotation,
  modelCamera,
  fallbackImage,
  active = true,
}) {
  const savedCamera = parseCameraCsv(modelCamera)
  const cameraPosition = savedCamera?.position || [3, 1, 3]
  const cameraFov = savedCamera?.fov || 40
  const cameraTarget = savedCamera?.target || [0, 0, 0]
  const [autoRotate, setAutoRotate] = useState(true)
  const [loadedModelUrl, setLoadedModelUrl] = useState(null)
  const [failedModelUrl, setFailedModelUrl] = useState(null)
  const [builtInFailedKey, setBuiltInFailedKey] = useState(null)
  const [webglAvailable] = useState(canUseWebGL)
  const [profile] = useState(getDevicePerformanceProfile)
  const resolvedModel = modelUrl
    ? resolveModelAsset(
      { src: modelUrl, liteSrc: modelLiteUrl, poster: fallbackImage, version: modelVersion },
      { quality: profile.preferLite ? 'lite' : 'full' },
    )
    : null
  const isUploadedModel = Boolean(resolvedModel?.src)
  const resolvedModelSrc = resolvedModel?.src
  const builtInModelKey = 'built-in-couch'
  const builtInModelFailed = !isUploadedModel && builtInFailedKey === builtInModelKey
  const modelLoadFailed = isUploadedModel && failedModelUrl === resolvedModelSrc
  const modelReady = !isUploadedModel || loadedModelUrl === resolvedModelSrc || modelLoadFailed

  useEffect(() => {
    if (!isUploadedModel || !resolvedModelSrc || modelReady) return undefined

    const timer = window.setTimeout(() => {
      setFailedModelUrl(resolvedModelSrc)
    }, MODEL_LOAD_TIMEOUT_MS)

    return () => window.clearTimeout(timer)
  }, [isUploadedModel, modelReady, resolvedModelSrc])

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
        camera={{ position: cameraPosition, fov: cameraFov }}
        dpr={[1, profile.dpr]}
        frameloop={active ? 'always' : 'demand'}
        gl={{
          antialias: profile.tier === 'high',
          powerPreference: profile.tier === 'high' ? 'high-performance' : 'default',
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          outputColorSpace: SRGBColorSpace,
        }}
        onPointerDown={() => setAutoRotate(false)}
        onPointerUp={() => {
          setTimeout(() => setAutoRotate(true), 3000)
        }}
      >
        <SceneEnvironment />
        <hemisphereLight args={[0xffffff, 0xe6e3d8, 0.65]} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} />
        <directionalLight position={[-4, 2, -3]} intensity={0.55} />
        <directionalLight position={[0, 3, -5]} intensity={0.4} />
        <AutoRotate enabled={autoRotate} target={cameraTarget} />
        <Center>
          {isUploadedModel ? (
            <ErrorBoundary
              key={resolvedModelSrc}
              fallback={(
                <ProductModelLoadFallback
                  onError={() => setFailedModelUrl(resolvedModelSrc)}
                />
              )}
            >
              <Suspense fallback={null}>
                <UploadedProductModel
                  url={resolvedModelSrc}
                  scale={modelScale}
                  rotation={modelRotation}
                  onReady={() => setLoadedModelUrl(resolvedModelSrc)}
                />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <ErrorBoundary
              fallback={<ProductModelLoadFallback onError={() => setBuiltInFailedKey(builtInModelKey)} />}
            >
              <Suspense fallback={null}>
                <Couch />
              </Suspense>
            </ErrorBoundary>
          )}
        </Center>
      </Canvas>
      {(modelLoadFailed || builtInModelFailed) && (
        <div className="absolute inset-0">
          <ThreeModelPlaceholder poster={fallbackImage} variant="product" label="Product preview unavailable" spinner={false} />
        </div>
      )}
      {!modelReady && (
        <LoadingSpinner className="model-loading-overlay" label="Loading product model" />
      )}
    </div>
  )
}
