/* eslint-disable react-hooks/immutability */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Center, Environment, Text } from '@react-three/drei'
import * as THREE from 'three'
import Room from '../../../components/Room'

const POINTER_LEAVE_RESET_MS = 120
const CAMERA_POSITION = [7, 0, -1]
const CAMERA_LOOK_AT_Y = -0.05
const FURNITURE_LABELS = [
  {
    name: 'Luna Sectional',
    price: '$1,280',
    anchor: [-0.62, 0.72, 1.12],
    label: [-1.04, 1, 1.28],
  },
  {
    name: 'Mesa Coffee Table',
    price: '$420',
    anchor: [-0.22, 0.22, 0.08],
    label: [-0.52, 0.6, 0.56],
  },
  {
    name: 'Walnut TV Drawer',
    price: '$690',
    anchor: [0.42, 0.62, -2.16],
    label: [-0.6, 1.02, -1.52],
  },
]

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

function FurnitureLabel({ name, price, anchor, label }) {
  const textRef = useRef(null)
  const { camera } = useThree()
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([...anchor, ...label], 3))
    geometry.computeBoundingSphere()
    return geometry
  }, [anchor, label])

  useEffect(() => {
    return () => lineGeometry.dispose()
  }, [lineGeometry])

  useFrame(() => {
    textRef.current?.lookAt(camera.position)
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
      <group ref={textRef} position={label}>
        <Text
          position={[0, 0.035, 0]}
          fontSize={0.055}
          color="#ffffff"
          anchorX="left"
          anchorY="middle"
          letterSpacing={0}
          maxWidth={0.7}
          depthTest
        >
          {name.toUpperCase()}
        </Text>
        <Text
          position={[0, -0.04, 0]}
          fontSize={0.085}
          color="#ffffff"
          anchorX="left"
          anchorY="middle"
          letterSpacing={0}
          depthTest
        >
          {price}
        </Text>
      </group>
    </group>
  )
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
        {FURNITURE_LABELS.map((label) => (
          <FurnitureLabel
            key={label.name}
            name={label.name}
            price={label.price}
            anchor={label.anchor}
            label={label.label}
          />
        ))}
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
