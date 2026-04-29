export default function ThreeModelPlaceholder({
  className = '',
  poster = '',
  label = 'Loading 3D view',
  variant = 'room',
}) {
  return (
    <div className={`three-placeholder three-placeholder-${variant} ${className}`} role="status" aria-label={label}>
      {poster ? <img src={poster} alt="" loading="eager" decoding="async" /> : null}
      <div className="three-placeholder-silhouette" aria-hidden="true" />
    </div>
  )
}
