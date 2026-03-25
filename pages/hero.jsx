import Room from "../components/Room"
import { OrbitControls, Bounds, Center } from "@react-three/drei"
import { useControls } from "leva"
import { useThree, useFrame, Canvas } from "@react-three/fiber"
import { useEffect, useState, useRef } from "react"


function CameraMouseMove({mouse}){
  const {camera} = useThree();

  const initial = useRef({
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
  })

  useFrame(()=>{
    const targetX = initial.current.z + mouse.current.z * 0.5
    const targetY = initial.current.y + mouse.current.y * 0.2

    camera.position.z += (targetX - camera.position.z )* 0.02
    camera.position.y += (targetY - camera.position.y)* 0.02

    camera.lookAt(0,0,0)
  })
  return null
}
export default function Hero() {

  const {x, y, z, fov} = useControls('Camera',{
    x: {value: 7, min: -50, max: 50, step: 1},
    y: {value: 0, min: -20, max: 20, step: 1},
    z: {value: -1, min: -20, max: 20, step: 1},
    fov: {value: 30, min: -200, max: 200, step: 10}
  })

  function CameraRig({ x, y, z, fov }) {
    const { camera } = useThree()
    useEffect(() => {
      camera.position.set(x, y, z)
      camera.fov = fov
      camera.updateProjectionMatrix()
    }, [x, y, z, fov, camera])
    return null
  }

  const mouse = useRef({x: 0, y: 0, z: 0});
  function handleMouseMove(e){
    mouse.current.z =( e.client / window.innerWidth - 0.5 ) * 2 
    mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2
  }

  function handleMouseLeave(e){
    mouse.current = {x: 0, y: 0}
  }
  return (
    <div 
    onMouseMove={handleMouseMove}
    onMouseLeave={handleMouseLeave}
    style={{ position: "relative", width: "100vw", height: "100vh" }} 
    className="overscroll-none">

      <Canvas
        style={{ position: "absolute", inset: 0 }}
        camera={{ position: [x, y, z], fov: 50 }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 5]} />
        <OrbitControls enableZoom={false} enablePan={false} />
        {/* <Animated/> */}
        <CameraRig x={x} y={y} z={z} fov={fov}/>
        <CameraMouseMove mouse={mouse}/>
        <Bounds clip observe margin={1}>
          <Center>
            {/* <Room/> */}
          </Center>
        </Bounds>
      </Canvas>

      <span
        style={{ position: "absolute", top: 32, left: 32, zIndex: 10 }}
        className="text-7xl sm:text-9xl"
      >
        Couch <br/> <span className="mx-50">Place</span>
      </span>

    </div>
  )
}