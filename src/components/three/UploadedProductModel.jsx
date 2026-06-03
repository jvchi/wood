import { useEffect, useLayoutEffect, useMemo } from 'react'
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

export default function UploadedProductModel({ url, scale = 1, rotation = '0,0,0', onReady, onBoundsChange }) {
  const { scene } = useGLTF(url)
  const [x, y, z] = parseRotation(rotation)
  const nextScale = Number(scale) || 1

  const model = useMemo(() => {
    const nextModel = clone(scene)

    nextModel.updateMatrixWorld(true)

    const bounds = new Box3().setFromObject(nextModel)
    const center = bounds.isEmpty() ? EMPTY_CENTER : bounds.getCenter(new Vector3())
    nextModel.position.sub(center)
    nextModel.updateMatrixWorld(true)

    return nextModel
  }, [scene])

  useLayoutEffect(() => {
    model.rotation.set(x, y, z)
    model.scale.setScalar(nextScale)
    model.updateMatrixWorld(true)

    const bounds = new Box3().setFromObject(model)
    if (bounds.isEmpty()) return

    const center = bounds.getCenter(new Vector3())
    const size = bounds.getSize(new Vector3())
    onBoundsChange?.({
      center: [center.x, center.y, center.z],
      size: [size.x, size.y, size.z],
    })
  }, [model, nextScale, onBoundsChange, x, y, z])

  useEffect(() => {
    onReady?.()
  }, [onReady, url])

  return <primitive object={model} />
}
