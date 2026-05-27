import { useGLTF, Center } from '@react-three/drei'
import {
  MODEL_ASSETS,
  MODEL_QUALITY,
  getDevicePerformanceProfile,
  resolveModelAsset,
} from '../src/lib/threeAssetStrategy'

export default function Couch() {
  const profile = getDevicePerformanceProfile()
  const gltf = useGLTF(resolveModelAsset(MODEL_ASSETS.couch, {
    quality: profile.preferLite ? MODEL_QUALITY.lite : MODEL_QUALITY.full,
  }).src)
  return (
    <group >
      <Center>
         <primitive object={gltf.scene} scale={1}/>
      </Center>
     
    </group>
  )
}
