export const DEFAULT_CAMERA_POSITION = [3, 1, 3]
export const DEFAULT_CAMERA_TARGET = [0, 0, 0]
export const DEFAULT_FOV = 40

export function parseCameraCsv(value) {
  if (!value || typeof value !== 'string') return null
  const parts = value.split('|').map(part => part.split(',').map(n => Number(n.trim())))
  const position = parts[0]
  const target = parts[1] || []
  const fov = parts[2]?.[0]
  if (!position || position.length < 3 || position.some(n => !Number.isFinite(n))) return null
  return {
    position: [position[0], position[1], position[2]],
    target: target.length >= 3 && target.every(Number.isFinite) ? [target[0], target[1], target[2]] : DEFAULT_CAMERA_TARGET,
    fov: Number.isFinite(fov) ? fov : DEFAULT_FOV,
  }
}

export function formatCameraCsv({ position, target, fov }) {
  const round = n => Number(Number(n).toFixed(3))
  const pos = position.map(round).join(',')
  const tgt = target.map(round).join(',')
  return `${pos}|${tgt}|${round(fov || DEFAULT_FOV)}`
}
