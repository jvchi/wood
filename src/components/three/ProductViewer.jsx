import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Center } from '@react-three/drei'
import Couch from '../../../components/Couch'

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

export default function ProductViewer() {
  const [autoRotate, setAutoRotate] = useState(true)

  return (
    <div className="h-full min-h-[400px] w-full bg-[var(--color-surface)]">
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [3, 1, 3], fov: 40 }}
        dpr={[1, 1.5]}
        onPointerDown={() => setAutoRotate(false)}
        onPointerUp={() => {
          setTimeout(() => setAutoRotate(true), 3000)
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 3]} intensity={0.7} />
        <AutoRotate enabled={autoRotate} />
        <Center>
          <Couch />
        </Center>
      </Canvas>
    </div>
  )
}
