import { useGLTF, Center } from '@react-three/drei'

export default function Couch() {
  const gltf = useGLTF('../public/models/couch.glb')
  return (
    <group >
      <Center>
         <primitive object={gltf.scene} scale={1}/>
      </Center>
     
    </group>
  )
}
