import { Canvas } from "@react-three/fiber"
import Couch from "../models/Couch"
import { OrbitControls, Bounds, Center } from "@react-three/drei"
export default function hero() {
  
  return (

    <section className="bg-neutral-200">
      <span className="text-9xl ">
        Couch
      </span>
      <Canvas 
        camera={{position: [-50, 1.5, 50], fov: 1, near: 0.1}}
        className="w-full min-h-screen flex justify-start items-center "
        >
          <ambientLight intensity={0.5}/>
          <directionalLight position={[2,5,5]}/>
          <axesHelper args={[5]} />
          <OrbitControls/>
          
          <Bounds fit clip observe margin={0.4}>
            <Center>
              <Couch className='h-full w-full'/>
            </Center>
            
          </Bounds>
      </Canvas>
    </section>
    
    
  )
}
