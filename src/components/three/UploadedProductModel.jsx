import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

const EMPTY_CENTER = new Vector3()

function parseRotation(rotation) {
  const values = String(rotation || '0,0,0').split(',').map(value => Number(value.trim()))
  return [
    Number.isFinite(values[0]) ? values[0] : 0,
    Number.isFinite(values[1]) ? values[1] : 0,
    Number.isFinite(values[2]) ? values[2] : 0,
  ]
}

export default function UploadedProductModel({ url, scale = 1, rotation = '0,0,0', onReady }) {
  const { scene } = useGLTF(url)

  const model = useMemo(() => {
    const nextModel = clone(scene)
    const [x, y, z] = parseRotation(rotation)
    const nextScale = Number(scale) || 1

    nextModel.rotation.set(x, y, z)
    nextModel.scale.setScalar(nextScale)
    nextModel.updateMatrixWorld(true)

    const bounds = new Box3().setFromObject(nextModel)
    const center = bounds.isEmpty() ? EMPTY_CENTER : bounds.getCenter(new Vector3())
    nextModel.position.sub(center)
    nextModel.updateMatrixWorld(true)

    return nextModel
  }, [rotation, scale, scene])

  useEffect(() => {
    onReady?.()
  }, [onReady, url])

  return <primitive object={model} />
}
