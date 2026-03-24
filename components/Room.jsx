import { useGLTF } from '@react-three/drei'

export default function Room() {
  const gltf = useGLTF('/models/room.glb')
  return (
    <primitive object={gltf.scene} scale={1}/>
  )
}
