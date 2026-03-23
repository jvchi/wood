import { useGLTF, Center } from '@react-three/drei'

export default function Couch() {
  const gltf = useGLTF('../src/assets/couch.glb')
  return (
    <group >
      <Center>
         <primitive object={gltf.scene} scale={10}/>
      </Center>
     
    </group>
  )
}
