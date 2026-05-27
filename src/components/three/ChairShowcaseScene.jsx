/* eslint-disable react-hooks/immutability */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import {
  MODEL_ASSETS,
  MODEL_QUALITY,
  canUseWebGL,
  getDevicePerformanceProfile,
  preloadModel,
  resolveModelAsset,
} from '../../lib/threeAssetStrategy'
import ErrorBoundary from '../ui/ErrorBoundary'

const CAMERA_DAMPING = 7
const MODEL_DAMPING = 8
const POINTER_DAMPING = 8
const DRAG_ROTATION_Y_STRENGTH = 0.01
const DRAG_ROTATION_X_STRENGTH = 0.0065
const DRAG_ROTATION_Y_LIMIT = 0.8
const DRAG_ROTATION_X_LIMIT = 0.28
const BASE_ROTATION_X = -0.12
const BASE_ROTATION_Y = -0.42

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

function easeOutQuint(value) {
  const t = clamp01(value)
  return 1 - Math.pow(1 - t, 5)
}

function easeInOutCubic(value) {
  const t = clamp01(value)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function getCameraValues(aspect) {
  if (aspect < 0.9) {
    return { position: new THREE.Vector3(0, 0.42, 4.7), fov: 24 }
  }

  return { position: new THREE.Vector3(0.08, 0.3, 4.2), fov: 20 }
}

function ShowcaseCamera({ active, pointerRef, sectionProgressRef }) {
  const { camera, size } = useThree()
  const easedProgress = useRef(0)
  const easedPointer = useRef({ x: 0, y: 0 })

  useFrame((_, delta) => {
    if (!active) return
    const progress = sectionProgressRef?.current ?? 0
    easedProgress.current = THREE.MathUtils.damp(easedProgress.current, progress, CAMERA_DAMPING, delta)
    easedPointer.current.x = THREE.MathUtils.damp(easedPointer.current.x, pointerRef.current.x, POINTER_DAMPING, delta)
    easedPointer.current.y = THREE.MathUtils.damp(easedPointer.current.y, pointerRef.current.y, POINTER_DAMPING, delta)

    const config = getCameraValues(size.width / Math.max(1, size.height))
    const target = config.position.clone()
    target.x += easedPointer.current.x * 0.12
    target.y += easedPointer.current.y * 0.06 + easedProgress.current * 0.06
    target.z -= easedProgress.current * 0.18

    camera.position.lerp(target, 1 - Math.exp(-delta * CAMERA_DAMPING))
    camera.fov = THREE.MathUtils.damp(camera.fov, config.fov - easedProgress.current, CAMERA_DAMPING, delta)
    camera.lookAt(easedPointer.current.x * 0.08, 0.2 + easedPointer.current.y * 0.04, 0)
    camera.updateProjectionMatrix()
  })

  return null
}

function ChairModel({ active, pointerRef, dragRef, hoverRef, sectionProgressRef, modelUrl, onReady }) {
  const { scene } = useGLTF(modelUrl)
  const { size } = useThree()
  const groupRef = useRef(null)
  const readyFrameCountRef = useRef(0)
  const readyCalledRef = useRef(false)

  const { model, scale } = useMemo(() => {
    const clone = scene.clone(true)

    clone.traverse((child) => {
      if (!child.isMesh) return
      child.castShadow = true
      child.receiveShadow = true
      if (child.material && 'envMapIntensity' in child.material) {
        child.material.envMapIntensity = 1
      }
    })

    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z, 0.001)
    const normalizedScale = 1.2 / maxDimension

    clone.position.sub(center)

    return {
      model: clone,
      scale: normalizedScale,
    }
  }, [scene])

  useFrame((_, delta) => {
    if (!readyCalledRef.current && groupRef.current) {
      readyFrameCountRef.current += 1
      if (readyFrameCountRef.current >= 2) {
        readyCalledRef.current = true
        onReady?.()
      }
    }

    if (!active) return
    if (!groupRef.current) return

    const progress = sectionProgressRef?.current ?? 0
    const pointerX = pointerRef.current.x
    const pointerY = pointerRef.current.y
    const time = performance.now() * 0.001
    const revealProgress = easeOutQuint(progress / 0.42)
    const settleProgress = easeInOutCubic((progress - 0.16) / 0.84)
    const revealSwing = Math.sin(revealProgress * Math.PI) * 0.16 * (1 - revealProgress)
    const hoverStrength = hoverRef.current ? 1 : 0.4

    if (!dragRef.current.active) {
      dragRef.current.rotationX = THREE.MathUtils.damp(dragRef.current.rotationX, 0, 8.5, delta)
      dragRef.current.rotationY = THREE.MathUtils.damp(dragRef.current.rotationY, 0, 8.5, delta)
    }

    const idleOffsetY = Math.sin(time * 0.8) * 0.028 * hoverStrength
    const idleRotationX = Math.sin(time * 1.2) * 0.024 * hoverStrength
    const idleRotationY = Math.cos(time * 0.9) * 0.04 * hoverStrength
    const dragRotationX = dragRef.current.rotationX
    const dragRotationY = dragRef.current.rotationY

    const aspect = size.width / Math.max(1, size.height)
    const baseOffsetX = aspect < 0.9 ? 0 : 0.34
    const targetPositionX = baseOffsetX * (1 - settleProgress) + pointerX * 0.045
    const targetPositionY = 0.18 + progress * 0.08 + idleOffsetY
    const targetRotationX = BASE_ROTATION_X + (1 - settleProgress) * 0.12 + pointerY * 0.03 + idleRotationX + dragRotationX
    const targetRotationY =
      1.72 * (1 - revealProgress) + BASE_ROTATION_Y * settleProgress + revealSwing + pointerX * 0.05 + idleRotationY + dragRotationY
    const targetScale = scale * (0.68 + revealProgress * 0.16 + settleProgress * 0.16)

    groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetPositionX, MODEL_DAMPING, delta)
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetPositionY, MODEL_DAMPING, delta)
    groupRef.current.rotation.x = THREE.MathUtils.damp(
      groupRef.current.rotation.x,
      targetRotationX,
      MODEL_DAMPING,
      delta,
    )
    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      targetRotationY,
      MODEL_DAMPING,
      delta,
    )
    groupRef.current.scale.setScalar(THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, MODEL_DAMPING, delta))
  })

  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  )
}

function StaticReadySignal({ onReady }) {
  useEffect(() => {
    onReady?.()
  }, [onReady])

  return null
}

export default function ChairShowcaseScene({ active = true, sectionProgressRef, onReady }) {
  const [webglAvailable] = useState(canUseWebGL)
  const [profile] = useState(getDevicePerformanceProfile)
  const [sceneReady, setSceneReady] = useState(false)
  const modelAsset = resolveModelAsset(MODEL_ASSETS.pipoChair, {
    quality: profile.preferLite ? MODEL_QUALITY.lite : MODEL_QUALITY.full,
  })
  const pointerRef = useRef({ x: 0, y: 0 })
  const hoverRef = useRef(false)
  const dragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    rotationX: 0,
    rotationY: 0,
  })

  function handlePointerMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect()
    pointerRef.current.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    pointerRef.current.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -2

    if (event.pointerType === 'touch' || !dragRef.current.active || dragRef.current.pointerId !== event.pointerId) return

    const nextRotationY = (event.clientX - dragRef.current.startX) * DRAG_ROTATION_Y_STRENGTH
    const nextRotationX = (event.clientY - dragRef.current.startY) * DRAG_ROTATION_X_STRENGTH

    dragRef.current.rotationX = THREE.MathUtils.clamp(
      nextRotationX,
      -DRAG_ROTATION_X_LIMIT,
      DRAG_ROTATION_X_LIMIT,
    )
    dragRef.current.rotationY = THREE.MathUtils.clamp(
      nextRotationY,
      -DRAG_ROTATION_Y_LIMIT,
      DRAG_ROTATION_Y_LIMIT,
    )
  }

  function handlePointerDown(event) {
    if (event.pointerType === 'touch') return
    if (dragRef.current.active) return
    dragRef.current.active = true
    dragRef.current.pointerId = event.pointerId
    dragRef.current.startX = event.clientX - dragRef.current.rotationY / DRAG_ROTATION_Y_STRENGTH
    dragRef.current.startY = event.clientY - dragRef.current.rotationX / DRAG_ROTATION_X_STRENGTH
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerUp(event) {
    if (event.pointerType === 'touch') return
    if (dragRef.current.pointerId !== event.pointerId) return
    dragRef.current.active = false
    dragRef.current.pointerId = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handlePointerLeave() {
    pointerRef.current = { x: 0, y: 0 }
    hoverRef.current = false
  }

  if (!webglAvailable || profile.preferStatic) {
    return (
      <div className="chair-scene-fallback" aria-hidden="true">
        <StaticReadySignal onReady={onReady} />
      </div>
    )
  }

  return (
    <div
      className="chair-scene-shell"
      onPointerEnter={() => {
        hoverRef.current = true
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, profile.dpr]}
        frameloop={active || !sceneReady ? 'always' : 'demand'}
        resize={{ scroll: false }}
        gl={{ antialias: true, alpha: true, powerPreference: profile.tier === 'high' ? 'high-performance' : 'default' }}
        camera={{ position: [0.08, 0.3, 4.2], fov: 20 }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight
          position={[3.5, 4.8, 3.2]}
          intensity={2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-2.4, 1.8, 3.4]} intensity={0.7} />
        <Environment preset="studio" />
        <ShowcaseCamera active={active} pointerRef={pointerRef} sectionProgressRef={sectionProgressRef} />
        <ErrorBoundary
          fallback={null}
        >
          <Suspense fallback={null}>
            <ChairModel
              active={active}
              pointerRef={pointerRef}
              dragRef={dragRef}
              hoverRef={hoverRef}
              sectionProgressRef={sectionProgressRef}
              modelUrl={modelAsset.src}
              onReady={() => {
                setSceneReady(true)
                onReady?.()
              }}
            />
          </Suspense>
        </ErrorBoundary>
      </Canvas>
    </div>
  )
}

preloadModel(MODEL_ASSETS.pipoChair)
