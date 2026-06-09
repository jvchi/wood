import { Link, useLocation } from 'react-router-dom'
import { motion as framerMotion } from 'framer-motion'
import { useState, forwardRef, useEffect, useRef } from 'react'
import { useWishlist } from '../../context/WishlistContext'
import {
  imageDisplayUrl,
  imageSrcSet,
  imageLqipUrl,
  markSupabaseTransformsBroken,
  useSupabaseTransformsAvailable,
} from '../../utils/imageThumb'

const MotionDiv = framerMotion.div
const MotionImg = framerMotion.img

const sharedImageTransition = {
  layout: {
    duration: 0.68,
    ease: [0.22, 1, 0.36, 1],
  },
  opacity: {
    duration: 0,
  },
}

const ProductCard = forwardRef(({ product, index = 0, variant, hideInfo = false }, ref) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isTall, setIsTall] = useState(false)
  const [isWide, setIsWide] = useState(false)
  const { isInWishlist, toggleItem } = useWishlist()
  const wishlisted = isInWishlist(product.id)
  const isMasonry = variant === 'masonry'
  const imageRef = useRef(null)
  const location = useLocation()
  const transformsAvailable = useSupabaseTransformsAvailable()
  const rawImage = product.images[0]
  const storedThumb = product.image_thumbnails?.[0]
  // When Supabase image transforms are usable, derive an LQIP from the source
  // (matches the main image's aspect ratio). When they aren't (Free tier),
  // fall back to the pre-uploaded square WebP — wrong ratio but it loads.
  const lqipSrc = transformsAvailable ? imageLqipUrl(rawImage) : storedThumb
  const fullImageSrc = transformsAvailable ? imageDisplayUrl(rawImage, { width: 960 }) : rawImage
  const fullImageSrcSet = transformsAvailable ? imageSrcSet(rawImage) : undefined
  const isPriority = index < 2
  const isAboveFold = index < 4
  // Stored dimensions reserve the right card height before the image loads,
  // eliminating the masonry reflow when the full image arrives. Older products
  // without saved dimensions fall back to the existing auto-height behaviour.
  const storedDim = product.image_dimensions?.[0]
  const mediaAspectRatio = storedDim?.width && storedDim?.height
    ? `${storedDim.width} / ${storedDim.height}`
    : undefined

  useEffect(() => {
    if (!imageRef.current || !imageLoaded) return
    const img = imageRef.current
    const card = img.closest('.product-card')
    if (!card) {
      return undefined
    }

    const updateLayout = () => {
      if (!img.naturalWidth) return
      const ratio = img.naturalHeight / img.naturalWidth
      const parentWidth = card.clientWidth
      setIsTall(parentWidth * ratio >= 500 && ratio > 1.25)
      setIsWide(ratio <= 0.85)
    }

    const observer = new ResizeObserver(() => {
      updateLayout()
    })
    
    observer.observe(card)
    return () => observer.disconnect()
  }, [imageLoaded, imageRef])

  return (
    <article
      ref={ref}
      className={`product-card group ${isMasonry ? 'product-card-masonry' : ''} ${imageLoaded ? 'is-image-loaded' : 'is-image-loading'} ${isTall ? 'is-tall' : ''} ${isWide ? 'is-wide' : ''}`}
      style={isMasonry ? { '--masonry-index': index % 6 } : undefined}
    >
      <MotionDiv
        layout={!isMasonry}
        layoutId={isMasonry ? undefined : `product-media-${product.id}`}
        className={`product-media ${isMasonry ? 'product-media-masonry' : ''}`}
        transition={sharedImageTransition}
        initial={false}
        animate={{ opacity: 1, borderRadius: 0 }}
        exit={{ opacity: 1 }}
        style={isMasonry && mediaAspectRatio ? { opacity: 1, aspectRatio: mediaAspectRatio } : { opacity: 1 }}
      >
        <Link
          to={`/product/${product.id}`}
          state={{ backgroundLocation: location }}
          className="block h-full"
          viewTransition
        >
          {lqipSrc && (
            <img
              className={imageLoaded ? 'product-card-thumbnail is-loaded' : 'product-card-thumbnail'}
              src={lqipSrc}
              alt=""
              width="800"
              height="1067"
              loading={isAboveFold ? 'eager' : 'lazy'}
              fetchPriority={isPriority ? 'high' : 'low'}
              decoding="async"
              aria-hidden="true"
              onError={event => {
                if (transformsAvailable) {
                  // Render endpoint isn't usable on this project — flip the
                  // global flag and let React swap us to the stored square
                  // thumbnail (or hide if there isn't one).
                  markSupabaseTransformsBroken()
                  return
                }
                event.currentTarget.style.display = 'none'
              }}
            />
          )}
          <MotionImg
            ref={imageRef}
            layoutId={isMasonry ? undefined : `product-image-${product.id}`}
            layout={!isMasonry}
            className={lqipSrc && !imageLoaded ? 'product-card-full-image is-loading' : 'product-card-full-image is-loaded'}
            src={fullImageSrc}
            srcSet={fullImageSrcSet}
            sizes="(max-width: 880px) 50vw, (max-width: 1280px) 33vw, 25vw"
            alt={product.name}
            width="800"
            height="1067"
            loading={isAboveFold ? 'eager' : 'lazy'}
            fetchPriority={isPriority ? 'high' : 'auto'}
            transition={sharedImageTransition}
            initial={false}
            animate={{ borderRadius: 0 }}
            exit={{ opacity: 1 }}
            onLoad={() => setImageLoaded(true)}
            onError={event => {
              if (transformsAvailable) {
                markSupabaseTransformsBroken()
                return
              }
              event.currentTarget.style.display = 'none'
            }}
          />
        </Link>
        <button
          type="button"
          onClick={() => toggleItem(product)}
          className={`pressable icon-button wishlist-toggle product-wishlist absolute right-1.5 top-1.5 ${wishlisted ? 'is-active' : ''}`}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
        >
          <span className="sr-only">{wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}</span>
          <svg
            className="heart-icon heart-outline"
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <svg
            className="heart-icon heart-filled"
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        {isMasonry && !hideInfo && (
          <div className="product-card-meta">
            <Link to={`/product/${product.id}`} viewTransition>
              <h3 className="product-title break-words">
                {product.name}
              </h3>
            </Link>
          </div>
        )}
      </MotionDiv>

      {!isMasonry && !hideInfo && (
        <div className="product-card-meta">
          <Link to={`/product/${product.id}`} viewTransition>
            <h3 className="product-title break-words">
              {product.name}
            </h3>
          </Link>
        </div>
      )}
    </article>
  )
})

export default ProductCard
