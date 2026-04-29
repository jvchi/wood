import { useGLTF } from '@react-three/drei'
import { MODEL_ASSETS, resolveModelAsset } from '../src/lib/threeAssetStrategy'

export default function Room() {
  const gltf = useGLTF(resolveModelAsset(MODEL_ASSETS.room).src)
  return (
    <primitive object={gltf.scene} scale={1}/>
  )
}
