/* eslint-disable react-hooks/immutability */
import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Center, Environment } from '@react-three/drei'
import Room from '../../../components/Room'

const POINTER_LEAVE_RESET_MS = 120
const CAMERA_POSITION = [7, 0, -1]
const CAMERA_LOOK_AT_Y = -0.05

function getCoverFov(aspect) {
  return aspect < 0.8 ? 28 : 30
}

function canUseWebGL() {
  if (typeof document === 'undefined') return false
  const canvas = document.createElement('canvas')
  return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
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

function ScrollDrivenCamera({ scrollDriven, scrollProgressRef }) {
  const { camera, size } = useThree()
  const aspect = size.width / Math.max(1, size.height)

  useFrame(() => {
    const progress = scrollDriven ? (scrollProgressRef?.current ?? 0) : 0
    const targetFov = getCoverFov(aspect) - progress * 3.2

    camera.position.set(CAMERA_POSITION[0], CAMERA_POSITION[1] + progress * 0.02, CAMERA_POSITION[2])
    camera.fov = targetFov
    camera.lookAt(0, CAMERA_LOOK_AT_Y - progress * 0.015, 0)
    camera.updateProjectionMatrix()
  })

  return null
}

function ScrollDrivenScene({ scrollDriven, pointer, scrollProgressRef }) {
  const groupRef = useRef(null)
  const easedPointer = useRef({ x: 0, y: 0 })

  useFrame(() => {
    if (!groupRef.current) return
    const progress = scrollDriven ? (scrollProgressRef?.current ?? 0) : 0
    easedPointer.current.x += (pointer.current.x - easedPointer.current.x) * 0.07
    easedPointer.current.y += (pointer.current.y - easedPointer.current.y) * 0.07

    groupRef.current.rotation.y = progress * 0.08 + easedPointer.current.x * 0.035
    groupRef.current.position.x = easedPointer.current.x * 0.08
    groupRef.current.position.y = progress * -0.02 + easedPointer.current.y * 0.035
    groupRef.current.scale.setScalar(1.02 + progress * 0.22)
  })

  return (
    <Center>
      <group ref={groupRef}>
        <Room />
      </group>
    </Center>
  )
}

export default function HeroScene({ fallbackImage, fallbackAlt = 'Featured couch', scrollDriven = false, scrollProgressRef }) {
  const [webglAvailable] = useState(canUseWebGL)
  const pointer = useRef({ x: 0, y: 0 })
  const lastPointerMoveAt = useRef(0)

  function handlePointerMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect()
    lastPointerMoveAt.current = performance.now()
    pointer.current.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    pointer.current.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -2
  }

  function handlePointerLeave() {
    if (scrollDriven && performance.now() - lastPointerMoveAt.current > POINTER_LEAVE_RESET_MS) return
    pointer.current = { x: 0, y: 0 }
  }

  if (!webglAvailable) {
    return (
      <div className="absolute inset-0">
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
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        camera={{ position: [7, 0, -1], fov: 30 }}
        dpr={[1, 1.5]}
      >
        {!scrollDriven && <CoverCamera />}
        {scrollDriven && <ScrollDrivenCamera scrollDriven scrollProgressRef={scrollProgressRef} />}
        <ambientLight intensity={0.65} />
        <directionalLight position={[2, 5, 5]} intensity={0.85} />
        <Environment preset="apartment" />
        {!scrollDriven && <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.45} />}
        <ScrollDrivenScene scrollDriven={scrollDriven} pointer={pointer} scrollProgressRef={scrollProgressRef} />
      </Canvas>
    </div>
  )
}
