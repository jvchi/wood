/* eslint-disable react-hooks/immutability */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Center, Environment, Text } from '@react-three/drei'
import * as THREE from 'three'
import Room from '../../../components/Room'
import { canUseWebGL, getDevicePerformanceProfile } from '../../lib/threeAssetStrategy'

const POINTER_LEAVE_RESET_MS = 120
const CAMERA_POSITION = [7, 0, -1]
const CAMERA_LOOK_AT_Y = -0.05
const SCROLL_DAMPING = 7.5
const POINTER_DAMPING = 8.5
const LABEL_HOVER_DAMPING = 12
const LABEL_HOVER_SCALE = 1.055
const LABEL_HOVER_WIDTH = 120
const LABEL_HOVER_HEIGHT = 46
const LABEL_HOVER_ACTIVE_MULTIPLIER = 1.55
const TOUCH_PAN_STRENGTH = 1.15
const TOUCH_PAN_LIMIT = 0.42
const FURNITURE_LABELS = [
  {
    name: 'Luna Sectional',
    price: '$1,280',
    anchor: [-0.62, 0.72, 1.12],
    label: [-0.82, 0.98, 1.22],
  },
  {
    name: 'Mesa Coffee Table',
    price: '$420',
    anchor: [-0.22, 0.22, 0.08],
    label: [-0.34, 0.58, 0.2],
  },
  {
    name: 'Walnut TV Drawer',
    price: '$690',
    anchor: [0.42, 0.62, -2.16],
    label: [0.08, 1.02, -1.72],
  },
]
const LABEL_ROTATION = [0, 1.68, 0]
const LABEL_LINE_GAP = 0.08

function getCoverFov(aspect) {
  return aspect < 0.8 ? 28 : 30
}

function CoverCamera() {
  const { camera, size } = useThree()
  const aspect = size.width / Math.max(1, size.height)

  useEffect(() => {
    const targetFov = getCoverFov(aspect)
    camera.position.set(...CAMERA_POSITION)
    camera.fov = targetFov
    camera.lookAt(0, CAMERA_LOOK_AT_Y, 0)
    camera.updateProjectionMatrix()
  }, [aspect, camera])

  return null
}

function ScrollDrivenCamera({ active, scrollDriven, scrollProgressRef }) {
  const { camera, size } = useThree()
  const aspect = size.width / Math.max(1, size.height)
  const easedProgress = useRef(0)

  useFrame((_, delta) => {
    if (!active) return
    const progress = scrollDriven ? (scrollProgressRef?.current ?? 0) : 0
    easedProgress.current = THREE.MathUtils.damp(easedProgress.current, progress, SCROLL_DAMPING, delta)
    const smoothProgress = easedProgress.current
    const targetFov = getCoverFov(aspect) - smoothProgress * 3.2

    camera.position.set(CAMERA_POSITION[0], CAMERA_POSITION[1] + smoothProgress * 0.02, CAMERA_POSITION[2])
    camera.fov = targetFov
    camera.lookAt(0, CAMERA_LOOK_AT_Y - smoothProgress * 0.015, 0)
    camera.updateProjectionMatrix()
  })

  return null
}

function HoverFocusController({ active, pointerScreen, hoveredLabel, sceneGroupRef, setHoveredLabel }) {
  const { camera, size } = useThree()
  const localPoint = useRef(new THREE.Vector3())
  const worldPoint = useRef(new THREE.Vector3())
  const projectedPoint = useRef(new THREE.Vector3())

  useFrame(() => {
    if (!active) return
    if (!pointerScreen.current.inside || !sceneGroupRef.current) {
      if (hoveredLabel !== null) setHoveredLabel(null)
      return
    }

    let nextHoveredLabel = null
    let nearestDistance = Infinity

    for (const item of FURNITURE_LABELS) {
      localPoint.current.set(...item.label)
      worldPoint.current.copy(localPoint.current)
      sceneGroupRef.current.localToWorld(worldPoint.current)
      projectedPoint.current.copy(worldPoint.current).project(camera)

      const screenX = ((projectedPoint.current.x + 1) * 0.5) * size.width
      const screenY = ((1 - projectedPoint.current.y) * 0.5) * size.height
      const isActive = hoveredLabel === item.name
      const halfWidth = (LABEL_HOVER_WIDTH * (isActive ? LABEL_HOVER_ACTIVE_MULTIPLIER : 1)) * 0.5
      const halfHeight = (LABEL_HOVER_HEIGHT * (isActive ? LABEL_HOVER_ACTIVE_MULTIPLIER : 1)) * 0.5
      const deltaX = Math.abs(pointerScreen.current.x - screenX)
      const deltaY = Math.abs(pointerScreen.current.y - screenY)

      if (deltaX > halfWidth || deltaY > halfHeight) continue

      const distance = deltaX + deltaY
      if (distance < nearestDistance) {
        nearestDistance = distance
        nextHoveredLabel = item.name
      }
    }

    if (nextHoveredLabel !== hoveredLabel) {
      setHoveredLabel(nextHoveredLabel)
    }
  })

  return null
}

function FurnitureLabel({ active, name, price, anchor, label, hovered }) {
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const anchorPoint = new THREE.Vector3(...anchor)
    const labelPoint = new THREE.Vector3(...label)
    const lineEnd = labelPoint.clone()
    const direction = labelPoint.clone().sub(anchorPoint)
    const length = direction.length()

    if (length > LABEL_LINE_GAP) {
      lineEnd.add(direction.normalize().multiplyScalar(-LABEL_LINE_GAP))
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute([...anchor, ...lineEnd.toArray()], 3))
    geometry.computeBoundingSphere()
    return geometry
  }, [anchor, label])

  useEffect(() => {
    return () => lineGeometry.dispose()
  }, [lineGeometry])

  const labelRef = useRef(null)
  const hoverScale = hovered ? LABEL_HOVER_SCALE : 1

  useFrame((_, delta) => {
    if (!active) return
    if (!labelRef.current) return
    const nextScale = THREE.MathUtils.damp(labelRef.current.scale.x, hoverScale, LABEL_HOVER_DAMPING, delta)
    labelRef.current.scale.setScalar(nextScale)
  })

  return (
    <group>
      <mesh position={anchor}>
        <sphereGeometry args={[0.014, 18, 18]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.72} depthTest />
      </mesh>
      <line geometry={lineGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.28} depthTest />
      </line>
      <group ref={labelRef} position={label} rotation={LABEL_ROTATION}>
        <Text
          position={[0, 0.035, 0]}
          fontSize={0.055}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0}
          maxWidth={0.7}
          depthTest
          material-side={THREE.DoubleSide}
        >
          {name.toUpperCase()}
        </Text>
        <Text
          position={[0, -0.04, 0]}
          fontSize={0.085}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0}
          depthTest
          material-side={THREE.DoubleSide}
        >
          {price}
        </Text>
      </group>
    </group>
  )
}

function SceneReadySignal({ onReady }) {
  const frameCountRef = useRef(0)
  const calledRef = useRef(false)

  useFrame(() => {
    if (calledRef.current) return
    frameCountRef.current += 1
    if (frameCountRef.current < 2) return
    calledRef.current = true
    onReady?.()
  })

  return null
}

function StaticReadySignal({ onReady }) {
  useEffect(() => {
    onReady?.()
  }, [onReady])

  return null
}

function ScrollDrivenScene({ active, scrollDriven, pointer, scrollProgressRef, sceneGroupRef, hoveredLabel, onReady }) {
  const easedProgress = useRef(0)
  const easedPointer = useRef({ x: 0, y: 0 })

  useFrame((_, delta) => {
    if (!active) return
    if (!sceneGroupRef.current) return
    const progress = scrollDriven ? (scrollProgressRef?.current ?? 0) : 0
    easedProgress.current = THREE.MathUtils.damp(easedProgress.current, progress, SCROLL_DAMPING, delta)
    easedPointer.current.x = THREE.MathUtils.damp(easedPointer.current.x, pointer.current.x, POINTER_DAMPING, delta)
    easedPointer.current.y = THREE.MathUtils.damp(easedPointer.current.y, pointer.current.y, POINTER_DAMPING, delta)
    const smoothProgress = easedProgress.current

    sceneGroupRef.current.rotation.y = smoothProgress * 0.08 + easedPointer.current.x * 0.035
    sceneGroupRef.current.position.x = easedPointer.current.x * 0.08
    sceneGroupRef.current.position.y = smoothProgress * -0.02 + easedPointer.current.y * 0.035
    sceneGroupRef.current.scale.setScalar(1.02 + smoothProgress * 0.22)
  })

  return (
    <Center>
      <group ref={sceneGroupRef}>
        <Room />
        <SceneReadySignal onReady={onReady} />
        {FURNITURE_LABELS.map((label) => (
          <FurnitureLabel
            key={label.name}
            active={active}
            name={label.name}
            price={label.price}
            anchor={label.anchor}
            label={label.label}
            hovered={hoveredLabel === label.name}
          />
        ))}
      </group>
    </Center>
  )
}

export default function HeroScene({ active = true, fallbackImage, fallbackAlt = 'Featured couch', scrollDriven = false, scrollProgressRef, onReady }) {
  const [webglAvailable] = useState(canUseWebGL)
  const [profile] = useState(getDevicePerformanceProfile)
  const pointer = useRef({ x: 0, y: 0 })
  const pointerScreen = useRef({ x: 0, y: 0, inside: false })
  const lastPointerMoveAt = useRef(0)
  const touchPan = useRef(null)
  const sceneGroupRef = useRef(null)
  const [hoveredLabel, setHoveredLabel] = useState(null)

  useEffect(() => {
    document.body.style.cursor = hoveredLabel ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hoveredLabel])

  function handleTouchPanStart(event) {
    if (event.pointerType !== 'touch' || !event.isPrimary) return
    touchPan.current = {
      startX: event.clientX,
      startY: event.clientY,
      width: Math.max(1, event.currentTarget.getBoundingClientRect().width),
    }
  }

  function handleTouchPanMove(event) {
    if (event.pointerType !== 'touch' || !event.isPrimary || !touchPan.current) return false
    const deltaX = event.clientX - touchPan.current.startX
    const deltaY = event.clientY - touchPan.current.startY

    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.25) return true

    pointer.current.x = THREE.MathUtils.clamp(
      (deltaX / touchPan.current.width) * TOUCH_PAN_STRENGTH,
      -TOUCH_PAN_LIMIT,
      TOUCH_PAN_LIMIT,
    )
    pointer.current.y = 0
    return true
  }

  function handleTouchPanEnd(event) {
    if (event.pointerType !== 'touch' || !event.isPrimary) return
    touchPan.current = null
    pointer.current = { x: 0, y: 0 }
    pointerScreen.current.inside = false
    setHoveredLabel(null)
  }

  function handlePointerMove(event) {
    if (handleTouchPanMove(event)) return
    const bounds = event.currentTarget.getBoundingClientRect()
    lastPointerMoveAt.current = performance.now()
    pointerScreen.current.x = event.clientX - bounds.left
    pointerScreen.current.y = event.clientY - bounds.top
    pointerScreen.current.inside = true
    pointer.current.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    pointer.current.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -2
  }

  function handlePointerLeave() {
    if (scrollDriven && performance.now() - lastPointerMoveAt.current > POINTER_LEAVE_RESET_MS) return
    pointer.current = { x: 0, y: 0 }
    pointerScreen.current.inside = false
    touchPan.current = null
    setHoveredLabel(null)
  }

  if (!webglAvailable || profile.preferStatic) {
    return (
      <div className="absolute inset-0">
        <StaticReadySignal onReady={onReady} />
        {fallbackImage && (
          <img
            src={fallbackImage}
            alt={fallbackAlt}
            className="h-full w-full object-cover"
            loading="eager"
          />
        )}
      </div>
    )
  }

  return (
    <div
      className="absolute inset-0"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={handleTouchPanStart}
      onPointerMove={handlePointerMove}
      onPointerUp={handleTouchPanEnd}
      onPointerCancel={handleTouchPanEnd}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        camera={{ position: [7, 0, -1], fov: 30 }}
        dpr={[1, profile.dpr]}
        frameloop={active ? 'always' : 'demand'}
        resize={{ scroll: false }}
        gl={{ antialias: profile.tier === 'high', powerPreference: profile.tier === 'high' ? 'high-performance' : 'default' }}
      >
        {!scrollDriven && <CoverCamera />}
        {scrollDriven && <ScrollDrivenCamera active={active} scrollDriven scrollProgressRef={scrollProgressRef} />}
        <HoverFocusController
          active={active}
          pointerScreen={pointerScreen}
          hoveredLabel={hoveredLabel}
          sceneGroupRef={sceneGroupRef}
          setHoveredLabel={setHoveredLabel}
        />
        <ambientLight intensity={0.65} />
        <directionalLight position={[2, 5, 5]} intensity={0.85} />
        <Environment preset="apartment" />
        {!scrollDriven && <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.45} />}
        <ScrollDrivenScene
          active={active}
          scrollDriven={scrollDriven}
          pointer={pointer}
          scrollProgressRef={scrollProgressRef}
          sceneGroupRef={sceneGroupRef}
          hoveredLabel={hoveredLabel}
          onReady={onReady}
        />
      </Canvas>
    </div>
  )
}
