import LoadingSpinner from '../ui/LoadingSpinner'

export default function ThreeModelPlaceholder({
  className = '',
  poster = '',
  label = 'Loading 3D view',
  variant = 'room',
  size = 56,
  spinner = variant !== 'room',
}) {
  return (
    <div className={`three-placeholder three-placeholder-${variant} ${className}`} role="status" aria-label={label}>
      {spinner ? (
        <LoadingSpinner label={label} size={size} />
      ) : (
        <>
          {poster ? <img src={poster} alt="" loading="eager" decoding="async" /> : null}
          <div className="three-placeholder-silhouette" aria-hidden="true" />
        </>
      )}
    </div>
  )
}
