import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Center, Environment } from '@react-three/drei'
import Room from '../../../components/Room'

function canUseWebGL() {
  if (typeof document === 'undefined') return false
  const canvas = document.createElement('canvas')
  return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
}

function ScrollDrivenScene({ scrollDriven, pointer }) {
  const groupRef = useRef(null)

  useFrame(() => {
    if (!groupRef.current) return
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    const progress = scrollDriven ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0
    const targetRotation = progress * 0.16 + pointer.current.x * 0.07
    const targetScale = 1
    const targetX = pointer.current.x * 0.16
    const targetY = progress * -0.05 + pointer.current.y * 0.06
    groupRef.current.rotation.y += (targetRotation - groupRef.current.rotation.y) * 0.08
    groupRef.current.position.x += (targetX - groupRef.current.position.x) * 0.07
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.07
    groupRef.current.scale.setScalar(targetScale)
  })

  return (
    <Center>
      <group ref={groupRef}>
        <Room />
      </group>
    </Center>
  )
}

export default function HeroScene({ fallbackImage, fallbackAlt = 'Featured couch', scrollDriven = false }) {
  const [webglAvailable] = useState(canUseWebGL)
  const pointer = useRef({ x: 0, y: 0 })

  function handlePointerMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect()
    pointer.current.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    pointer.current.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -2
  }

  function handlePointerLeave() {
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
        <ambientLight intensity={0.65} />
        <directionalLight position={[2, 5, 5]} intensity={0.85} />
        <Environment preset="apartment" />
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={!scrollDriven} autoRotate={!scrollDriven} autoRotateSpeed={0.45} />
        <ScrollDrivenScene scrollDriven={scrollDriven} pointer={pointer} />
      </Canvas>
    </div>
  )
}
