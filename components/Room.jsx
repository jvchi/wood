import { useGLTF } from '@react-three/drei'
import {
  MODEL_ASSETS,
  MODEL_QUALITY,
  getDevicePerformanceProfile,
  resolveModelAsset,
} from '../src/lib/threeAssetStrategy'

export default function Room() {
  const profile = getDevicePerformanceProfile()
  const gltf = useGLTF(resolveModelAsset(MODEL_ASSETS.room, {
    quality: profile.preferLite ? MODEL_QUALITY.lite : MODEL_QUALITY.full,
  }).src)
  return (
    <primitive object={gltf.scene} scale={1}/>
  )
}
