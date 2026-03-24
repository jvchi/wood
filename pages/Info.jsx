import React from 'react'
import { Canvas } from '@react-three/fiber'
import Couch from '../components/Couch'
import { OrbitControls } from '@react-three/drei'
// import { AmbientLight, DirectionalLight } from 'three'

export default function Info() {
  console.log(OrbitControls)
  return (
    <section className='w-full h-screen bg-neutral-200 flex flex-row justify-center items-center'>
      <div className='w-1/2 h-full flex justify-center items-center text-neutral-500 text-7xl'>About Couch Place</div>
      <div className='w-1/2 h-full relative'>
      <Canvas style={{position: 'absolute' }}>
        <ambientLight />
        <directionalLight position={[0, 5, 1]}/>
        <OrbitControls enableDamping={false} enablePan={false} enableZoom={false} />
        <Couch/>
      </Canvas>
      </div>
    </section>
  )
}
