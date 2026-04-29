import { Link, useLocation } from 'react-router-dom'
import { motion as framerMotion } from 'framer-motion'
import { useState, forwardRef, useEffect, useRef } from 'react'
import { formatPrice } from '../../utils/formatPrice'
import { useWishlist } from '../../context/WishlistContext'

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

const ProductCard = forwardRef(({ product, index = 0, variant }, ref) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isTall, setIsTall] = useState(false)
  const { isInWishlist, toggleItem } = useWishlist()
  const wishlisted = isInWishlist(product.id)
  const isMasonry = variant === 'masonry'
  const imageRef = useRef(null)
  const location = useLocation()

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
      // Evaluate if the card would exceed ~500px in height before applying flex-row
      const parentWidth = card.clientWidth
      if (parentWidth * ratio >= 500 && ratio > 1.25) {
        setIsTall(true)
      } else {
        setIsTall(false)
      }
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
      className={`product-card group ${isMasonry ? 'product-card-masonry' : ''} ${isTall ? 'is-tall' : ''}`}
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
        style={{ opacity: 1 }}
      >
        <Link
          to={`/product/${product.id}`}
          state={{ backgroundLocation: location }}
          className="block h-full"
        >
          {!imageLoaded && (
            <div className="absolute inset-0 bg-[var(--color-surface-muted)]" />
          )}
          <MotionImg
            ref={imageRef}
            layoutId={isMasonry ? undefined : `product-image-${product.id}`}
            layout={!isMasonry}
            src={product.images[0]}
            alt={product.name}
            width="800"
            height="1067"
            loading="lazy"
            transition={sharedImageTransition}
            initial={false}
            animate={{ opacity: 1, borderRadius: 0 }}
            exit={{ opacity: 1 }}
            style={{ opacity: 1 }}
            onLoad={() => setImageLoaded(true)}
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
      </MotionDiv>

      <div className="product-card-meta">
        <Link to={`/product/${product.id}`}>
          <h3 className="product-title break-words">
            {product.name}
          </h3>
        </Link>
        <p className="product-price">
          {product.stock_quantity <= 0 || product.stock <= 0 ? 'Out of stock' : formatPrice(product.price, product.currency)}
        </p>
      </div>
    </article>
  )
})

export default ProductCard
