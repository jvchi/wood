import { useEffect, useRef, useState } from 'react'
import { imageLqipUrl, imageThumbUrl, TRANSPARENT_PIXEL } from '../../utils/imageThumb'

// SmartImage renders a low-quality blurred placeholder instantly, then swaps
// to the high-resolution source once it has fully decoded — preventing the
// progressive top-to-bottom clipping you get when a raw <img> streams in.
//
// It also guarantees the user never sees a broken-image icon: if the primary
// source fails, it falls back to the original URL; if that also fails, it
// keeps the LQIP background visible and renders a transparent pixel.
//
// Props:
//   src           — the canonical (full quality) image URL
//   width/quality — optional override for the rendered (HQ) variant. Pass
//                   `width: null` to use the original uncompressed source.
//   alt, className, style, sizes, loading, fetchPriority, onLoad, ...rest
export default function SmartImage({
  src,
  alt = '',
  className = '',
  style,
  width = null,
  quality = 90,
  loading = 'lazy',
  fetchPriority,
  decoding = 'async',
  onLoad,
  imgProps,
  ...rest
}) {
  const hqSrc = src
    ? width
      ? imageThumbUrl(src, { width, quality })
      : src
    : null
  const lqipSrc = src ? imageLqipUrl(src) : null

  const [loaded, setLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(hqSrc)
  const imgRef = useRef(null)
  const triedOriginal = useRef(false)
  const triedFail = useRef(false)

  // Reset on src change so swapping product/active image doesn't keep stale state.
  useEffect(() => {
    setLoaded(false)
    setCurrentSrc(hqSrc)
    triedOriginal.current = false
    triedFail.current = false
  }, [hqSrc])

  // Cached images may complete before React attaches `onLoad`. Sync after mount/update.
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth > 0 && img.src !== TRANSPARENT_PIXEL) {
      setLoaded(true)
    }
  })

  const handleError = event => {
    const img = event.currentTarget
    if (!triedOriginal.current && src && img.src !== src) {
      triedOriginal.current = true
      img.src = src
      return
    }
    if (!triedFail.current) {
      triedFail.current = true
      img.src = TRANSPARENT_PIXEL
    }
  }

  return (
    <span
      className={`smart-image ${loaded ? 'is-loaded' : ''} ${className}`}
      style={{
        ...style,
        backgroundImage: lqipSrc ? `url("${lqipSrc}")` : undefined,
      }}
      {...rest}
    >
      {hqSrc && (
        <img
          {...imgProps}
          ref={imgRef}
          src={currentSrc || TRANSPARENT_PIXEL}
          alt={alt}
          loading={loading}
          decoding={decoding}
          fetchPriority={fetchPriority}
          onLoad={event => {
            // Ignore the onLoad fired by our transparent-pixel fallback.
            if (event.currentTarget.src === TRANSPARENT_PIXEL) return
            setLoaded(true)
            onLoad?.(event)
          }}
          onError={handleError}
        />
      )}
    </span>
  )
}
