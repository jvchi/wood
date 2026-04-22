/* eslint-disable react-hooks/immutability */
import { useRef, useEffect } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Bounds, Center, Environment } from '@react-three/drei'
import Room from '../../../components/Room'

function CameraMouseMove({ mouse }) {
  const { camera } = useThree()

  const initial = useRef({
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
  })

  useFrame(() => {
    const targetX = initial.current.z + mouse.current.z * 0.5
    const targetY = initial.current.y + mouse.current.y * 0.2

    camera.position.z += (targetX - camera.position.z) * 0.02
    camera.position.y += (targetY - camera.position.y) * 0.02
    camera.lookAt(0, 0, 0)
  })

  return null
}

function CameraRig({ x, y, z, fov }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(x, y, z)
    camera.fov = fov
    camera.updateProjectionMatrix()
  }, [x, y, z, fov, camera])
  return null
}

export default function HeroScene() {
  const mouse = useRef({ x: 0, y: 0, z: 0 })

  function handleMouseMove(e) {
    mouse.current.z = (e.clientX / window.innerWidth - 0.5) * 2
    mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2
  }

  function handleMouseLeave() {
    mouse.current = { x: 0, y: 0, z: 0 }
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="absolute inset-0"
    >
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        camera={{ position: [7, 0, -1], fov: 30 }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 5, 5]} intensity={0.6} />
        <OrbitControls enableZoom={false} enablePan={false} />
        <CameraRig x={7} y={0} z={-1} fov={30} />
        <CameraMouseMove mouse={mouse} />
        <Bounds clip observe margin={1}>
          <Center>
            <Room />
          </Center>
        </Bounds>
      </Canvas>
    </div>
  )
}
