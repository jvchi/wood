import { Canvas } from "@react-three/fiber"
import Room from "../components/Room"
import { OrbitControls, Bounds, Center } from "@react-three/drei"
import { useControls } from "leva"
import { useThree } from "@react-three/fiber"
import { useEffect } from "react"

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
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>

      <Canvas
        onPointerMove={()=> console.log('pointer')}
        style={{ position: "absolute", inset: 0 }}
        camera={{ position: [x, y, z], fov: 50 }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 5]} />
        {/* <OrbitControls /> */}
        {/* <CameraRig x={x} y={y} z={z} fov={fov}/> */}
        <Bounds clip observe margin={1}>
          <Center>
            <Room/>
          </Center>
        </Bounds>
      </Canvas>

      <span
        style={{ position: "absolute", top: 32, left: 32, zIndex: 10 }}
        className="text-7xl sm:text-9xl"
      >
        Couch
      </span>

    </div>
  )
}