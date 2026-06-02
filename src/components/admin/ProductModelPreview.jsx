import { Suspense, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { ACESFilmicToneMapping, SRGBColorSpace, Vector2, Vector3, Vector4, PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import ThreeModelPlaceholder from '../three/ThreeModelPlaceholder'
import LoadingSpinner from '../ui/LoadingSpinner'
import UploadedProductModel from '../three/UploadedProductModel'
import ErrorBoundary from '../ui/ErrorBoundary'
import { canUseWebGL, getDevicePerformanceProfile, resolveModelAsset } from '../../lib/threeAssetStrategy'
import { DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_TARGET, DEFAULT_FOV, parseCameraCsv } from '../../lib/modelCamera'

// Generous timeout — large GLBs (15+ MB) over typical broadband easily
// exceed 10s, and admin previews shouldn't bail early. Retry button below
// lets the admin recover without reloading the page.
const MODEL_LOAD_TIMEOUT_MS = 45000

function ModelLoadFallback({ onError }) {
  useEffect(() => {
    onError?.()
  }, [onError])

  return null
}

// Adds a baked RoomEnvironment as scene.environment so PBR materials
// (especially metallic/rough surfaces) have something to reflect — without
// this they render near-black. RoomEnvironment is shipped with three itself,
// so there is no network fetch and Suspense never blocks.
function SceneEnvironment() {
  const { gl, scene } = useThree()
  const sceneRef = useRef(scene)

  useEffect(() => {
    sceneRef.current = scene
  }, [scene])

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const rt = pmrem.fromScene(room, 0.04)
    const currentScene = sceneRef.current
    const prev = currentScene.environment
    currentScene.environment = rt.texture
    return () => {
      currentScene.environment = prev
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
  }, [gl])
  return null
}

// Bridges live OrbitControls + camera state out of the Canvas tree.
function CameraStateBridge({ controlsRef, stateRef }) {
  const { camera } = useThree()
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return undefined
    const sync = () => {
      stateRef.current = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        fov: camera.fov,
      }
    }
    sync()
    controls.addEventListener('change', sync)
    return () => controls.removeEventListener('change', sync)
  }, [camera, controlsRef, stateRef])
  return null
}

// Exposes a high-resolution PNG capture API to the imperative handle.
function CaptureBridge({ controlsRef, captureRef }) {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    async function captureOnce({
      width = 3840,
      height = 2160,
      supersample = 2,
      transparent = true,
      exposure = 1.05,
      aspectRatio = null,
    } = {}) {
      const outWidth = Math.max(1, Math.round(width))
      const outHeight = Math.max(1, Math.round(height))
      const liveW = gl.domElement.clientWidth || gl.domElement.width || outWidth
      const liveH = gl.domElement.clientHeight || gl.domElement.height || outHeight
      const cropAspect = aspectRatio && Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : null
      const cropCssW = cropAspect ? Math.min(0.92 * liveW, 0.92 * liveH * cropAspect) : liveW
      const cropCssH = cropAspect ? cropCssW / cropAspect : liveH
      const cropCssX = cropAspect ? (liveW - cropCssW) / 2 : 0
      const cropCssY = cropAspect ? (liveH - cropCssH) / 2 : 0
      const context = gl.getContext()
      const viewportDims = context.getParameter(context.MAX_VIEWPORT_DIMS)
      const maxRenderbufferSize = context.getParameter(context.MAX_RENDERBUFFER_SIZE)
      const maxRenderSize = Math.max(
        1,
        Math.min(
          gl.capabilities?.maxTextureSize || 8192,
          maxRenderbufferSize || 8192,
          viewportDims?.[0] || 8192,
          viewportDims?.[1] || 8192,
        ),
      )
      const requestedScale = Math.max(1, Number(supersample) || 1)
      const targetCropScale = Math.max(outWidth / cropCssW, outHeight / cropCssH) * requestedScale
      const renderScale = Math.max(
        0.25,
        Math.min(targetCropScale, maxRenderSize / liveW, maxRenderSize / liveH),
      )
      const ssWidth = Math.max(1, Math.min(maxRenderSize, Math.round(liveW * renderScale)))
      const ssHeight = Math.max(1, Math.min(maxRenderSize, Math.round(liveH * renderScale)))
      const cropX = Math.max(0, Math.round(cropCssX * renderScale))
      const cropY = Math.max(0, Math.round(cropCssY * renderScale))
      const cropW = Math.max(1, Math.min(ssWidth - cropX, Math.round(cropCssW * renderScale)))
      const cropH = Math.max(1, Math.min(ssHeight - cropY, Math.round(cropCssH * renderScale)))

      // Snapshot renderer + scene + camera state so we can restore exactly.
      const prevSize = new Vector2()
      gl.getSize(prevSize)
      const prevPixelRatio = gl.getPixelRatio()
      const prevViewport = new Vector4()
      const prevScissor = new Vector4()
      gl.getViewport(prevViewport)
      gl.getScissor(prevScissor)
      const prevScissorTest = gl.getScissorTest()
      const prevToneMapping = gl.toneMapping
      const prevExposure = gl.toneMappingExposure
      const prevOutputColorSpace = gl.outputColorSpace
      const prevClearAlpha = gl.getClearAlpha()
      const prevBackground = scene.background
      const prevEnv = scene.environment
      const prevAspect = camera.aspect
      const prevAutoClear = gl.autoClear
      const prevFov = camera.fov

      // Cinematic env map for reflections + ambient lighting.
      const pmrem = new PMREMGenerator(gl)
      const roomEnv = new RoomEnvironment()
      const envRT = pmrem.fromScene(roomEnv, 0.04)
      scene.environment = envRT.texture

      if (transparent) {
        scene.background = null
        gl.setClearAlpha(0)
      }
      gl.toneMapping = ACESFilmicToneMapping
      gl.toneMappingExposure = exposure
      gl.outputColorSpace = SRGBColorSpace
      gl.autoClear = true

      gl.setPixelRatio(1)
      gl.setSize(ssWidth, ssHeight, false)
      gl.setViewport(0, 0, ssWidth, ssHeight)
      gl.setScissor(0, 0, ssWidth, ssHeight)
      gl.setScissorTest(false)
      camera.aspect = ssWidth / ssHeight
      camera.updateProjectionMatrix()

      gl.clear(true, true, true)
      gl.render(scene, camera)
      const dataUrl = gl.domElement.toDataURL('image/png')

      // Restore everything before any awaits resolve so the live preview
      // doesn't render a frame at the capture size.
      scene.environment = prevEnv
      scene.background = prevBackground
      gl.setClearAlpha(prevClearAlpha)
      gl.toneMapping = prevToneMapping
      gl.toneMappingExposure = prevExposure
      gl.outputColorSpace = prevOutputColorSpace
      gl.autoClear = prevAutoClear
      gl.setPixelRatio(prevPixelRatio)
      gl.setSize(prevSize.x, prevSize.y, false)
      gl.setViewport(prevViewport)
      gl.setScissor(prevScissor)
      gl.setScissorTest(prevScissorTest)
      camera.aspect = prevAspect
      camera.fov = prevFov
      camera.updateProjectionMatrix()
      envRT.dispose()
      pmrem.dispose()
      roomEnv.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach(m => m.dispose())
        }
      })

      // Downscale the supersampled image for clean antialiasing.
      const img = new Image()
      img.src = dataUrl
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })
      const out = document.createElement('canvas')
      out.width = outWidth
      out.height = outHeight
      const ctx = out.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outWidth, outHeight)
      const blob = await new Promise(resolve => out.toBlob(resolve, 'image/png'))
      return blob
    }

    captureRef.current = {
      capture: captureOnce,
      captureTurntable: async (count = 8, opts = {}) => {
        const controls = controlsRef.current
        if (!controls) return []
        const target = controls.target.clone()
        const startPos = camera.position.clone()
        const offset = startPos.clone().sub(target)
        const radius = offset.length()
        const yOff = offset.y
        const horiz = Math.sqrt(Math.max(radius * radius - yOff * yOff, 0))
        const startAngle = Math.atan2(offset.x, offset.z)
        const blobs = []
        for (let i = 0; i < count; i += 1) {
          const angle = startAngle + (i * Math.PI * 2) / count
          camera.position.set(
            target.x + Math.sin(angle) * horiz,
            target.y + yOff,
            target.z + Math.cos(angle) * horiz,
          )
          camera.lookAt(target)
          controls.update()
          const blob = await captureOnce(opts)
          if (blob) blobs.push(blob)
          if (opts.onProgress) opts.onProgress(i + 1, count)
        }
        camera.position.copy(startPos)
        camera.lookAt(target)
        controls.update()
        return blobs
      },
    }
    return () => {
      captureRef.current = null
    }
  }, [gl, scene, camera, controlsRef, captureRef])

  return null
}

const ProductModelPreview = forwardRef(function ProductModelPreview(
  { modelUrl, fallbackImage, scale, rotation, camera, aspectRatio, aspectLabel, showAspectGhost = true },
  ref,
) {
  const [failedModelUrl, setFailedModelUrl] = useState(null)
  const [loadedModelUrl, setLoadedModelUrl] = useState(null)
  const [webglAvailable] = useState(canUseWebGL)
  // Admin preview deliberately bypasses the device-performance profile's
  // preferStatic flag — the admin uploaded this model and needs to see it
  // even on reduced-motion / save-data / low-memory setups. WebGL availability
  // is still respected.
  const [profile] = useState(() => {
    const base = getDevicePerformanceProfile()
    return { ...base, preferStatic: false, preferLite: false }
  })
  const resolvedModel = modelUrl ? resolveModelAsset({ src: modelUrl, poster: fallbackImage }) : null
  const resolvedModelSrc = resolvedModel?.src
  const modelReady = loadedModelUrl === resolvedModelSrc
  const failed = failedModelUrl === resolvedModelSrc

  const parsedCamera = useMemo(() => parseCameraCsv(camera) || {
    position: DEFAULT_CAMERA_POSITION,
    target: DEFAULT_CAMERA_TARGET,
    fov: DEFAULT_FOV,
  }, [camera])
  const controlsRef = useRef(null)
  const cameraStateRef = useRef({ ...parsedCamera })
  const captureRef = useRef(null)

  useImperativeHandle(ref, () => ({
    getCameraState() {
      return cameraStateRef.current
    },
    resetCamera() {
      const controls = controlsRef.current
      if (!controls) return
      controls.object.position.set(...DEFAULT_CAMERA_POSITION)
      controls.target.set(...DEFAULT_CAMERA_TARGET)
      controls.update()
    },
    resetPosition() {
      const controls = controlsRef.current
      if (!controls) return null
      const camera = controls.object
      const target = new Vector3(...DEFAULT_CAMERA_TARGET)
      const distance = camera.position.distanceTo(controls.target)
      const direction = new Vector3()
      camera.getWorldDirection(direction)

      camera.position.copy(target).add(direction.multiplyScalar(-distance))
      controls.target.copy(target)
      controls.update()

      return {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        fov: camera.fov,
      }
    },
    panBy(deltaX = 0, deltaY = 0) {
      const controls = controlsRef.current
      if (!controls) return null
      const camera = controls.object
      const targetDistance = camera.position.distanceTo(controls.target)
      const panScale = Math.max(0.08, targetDistance * 0.12)
      const right = new Vector3()
      const direction = new Vector3()
      const up = new Vector3()
      camera.getWorldDirection(direction)
      right.crossVectors(direction, camera.up).normalize()
      up.copy(camera.up).normalize()
      const offset = right.multiplyScalar(deltaX * panScale).add(up.multiplyScalar(deltaY * panScale))
      camera.position.add(offset)
      controls.target.add(offset)
      controls.update()
      return {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        fov: camera.fov,
      }
    },
    isReady() {
      return Boolean(captureRef.current && modelReady)
    },
    async captureSnapshot(opts) {
      if (!captureRef.current) return null
      return captureRef.current.capture(opts)
    },
    async captureTurntable(count, opts) {
      if (!captureRef.current) return []
      return captureRef.current.captureTurntable(count, opts)
    },
    retry() {
      setFailedModelUrl(null)
      setLoadedModelUrl(null)
    },
  }), [modelReady])

  useEffect(() => {
    if (!resolvedModelSrc || modelReady || failed) return undefined
    const timer = window.setTimeout(() => setFailedModelUrl(resolvedModelSrc), MODEL_LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [failed, modelReady, resolvedModelSrc])

  const ghostOverlay = showAspectGhost && Number.isFinite(aspectRatio) && aspectRatio > 0 ? (
    <div className="admin-model-aspect-ghost" aria-hidden="true">
      <div className="admin-model-aspect-ghost-box" style={{ '--ar': aspectRatio }}>
        <div className="admin-model-safe-area">
          <span className="admin-model-safe-area-label">Safe area</span>
        </div>
        {aspectLabel && <span className="admin-model-aspect-ghost-label">{aspectLabel}</span>}
      </div>
    </div>
  ) : null

  if (!resolvedModel?.src || failed || !webglAvailable || profile.preferStatic) {
    return (
      <div className="admin-model-preview-frame admin-model-fallback">
        {fallbackImage ? <img src={fallbackImage} alt="" /> : <ThreeModelPlaceholder variant="product" label="No 3D model" spinner={false} />}
        {failed && (
          <button
            type="button"
            className="admin-model-preview-retry pressable"
            onClick={() => {
              setFailedModelUrl(null)
              setLoadedModelUrl(null)
            }}
          >
            Model didn’t load — retry
          </button>
        )}
        {ghostOverlay}
      </div>
    )
  }

  return (
    <div className="admin-model-preview-frame">
      <Canvas
        camera={{ position: parsedCamera.position, fov: parsedCamera.fov }}
        dpr={[1, profile.dpr]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
          alpha: true,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          outputColorSpace: SRGBColorSpace,
        }}
        onError={() => setFailedModelUrl(resolvedModelSrc)}
      >
        <SceneEnvironment />
        <hemisphereLight args={[0xffffff, 0xe6e3d8, 0.65]} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} />
        <directionalLight position={[-4, 2, -3]} intensity={0.55} />
        <directionalLight position={[0, 3, -5]} intensity={0.4} />
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
        <OrbitControls ref={controlsRef} target={parsedCamera.target} makeDefault />
        <CameraStateBridge controlsRef={controlsRef} stateRef={cameraStateRef} />
        <CaptureBridge controlsRef={controlsRef} captureRef={captureRef} />
      </Canvas>
      {ghostOverlay}
      {!modelReady && (
        <LoadingSpinner className="model-loading-overlay" label="Loading product model" />
      )}
    </div>
  )
})

export default ProductModelPreview
