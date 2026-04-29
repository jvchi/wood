import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Center, OrbitControls, useGLTF } from '@react-three/drei'
import Skeleton from '../ui/Skeleton'
import ThreeModelPlaceholder from '../three/ThreeModelPlaceholder'
import { canUseWebGL, getDevicePerformanceProfile, resolveModelAsset } from '../../lib/threeAssetStrategy'

function UploadedModel({ url, scale = 1, rotation = '0,0,0' }) {
  const { scene } = useGLTF(url)
  const [x = 0, y = 0, z = 0] = String(rotation).split(',').map(Number)
  return <primitive object={scene} scale={Number(scale) || 1} rotation={[x, y, z]} />
}

export default function ProductModelPreview({ modelUrl, fallbackImage, scale, rotation }) {
  const [failed, setFailed] = useState(false)
  const [webglAvailable] = useState(canUseWebGL)
  const [profile] = useState(getDevicePerformanceProfile)
  const resolvedModel = modelUrl ? resolveModelAsset({ src: modelUrl, poster: fallbackImage }) : null

  if (!resolvedModel?.src || failed || !webglAvailable || profile.preferStatic) {
    return (
      <div className="admin-model-fallback">
        {fallbackImage ? <img src={fallbackImage} alt="" /> : <ThreeModelPlaceholder variant="product" label="No 3D model" />}
      </div>
    )
  }

  return (
    <div className="admin-model-preview">
      <Canvas
        camera={{ position: [3, 1.5, 3], fov: 42 }}
        dpr={[1, profile.dpr]}
        gl={{ antialias: profile.tier === 'high', powerPreference: profile.tier === 'high' ? 'high-performance' : 'default' }}
        onError={() => setFailed(true)}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 4, 3]} intensity={0.9} />
        <Suspense fallback={null}>
          <Center>
            <UploadedModel url={resolvedModel.src} scale={scale} rotation={rotation} />
          </Center>
        </Suspense>
        <OrbitControls enablePan={false} />
      </Canvas>
      <Suspense fallback={<Skeleton className="h-full w-full" />} />
    </div>
  )
}
