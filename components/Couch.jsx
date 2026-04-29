import { useGLTF, Center } from '@react-three/drei'
import { MODEL_ASSETS, resolveModelAsset } from '../src/lib/threeAssetStrategy'

export default function Couch() {
  const gltf = useGLTF(resolveModelAsset(MODEL_ASSETS.couch).src)
  return (
    <group >
      <Center>
         <primitive object={gltf.scene} scale={1}/>
      </Center>
     
    </group>
  )
}
