import { Link, useNavigate } from 'react-router-dom'
import { useState, useRef, useCallback } from 'react'
import { formatPrice } from '../../utils/formatPrice'
import { useWishlist } from '../../context/WishlistContext'
import { captureElement } from '../../hooks/useSharedHeroTransition'

export default function ProductCard({ product, index = 0, variant }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const { isInWishlist, toggleItem } = useWishlist()
  const wishlisted = isInWishlist(product.id)
  const isMasonry = variant === 'masonry'
  const navigate = useNavigate()
  const imageRef = useRef(null)

  /* Shared layout animation: snapshot the image rect before navigating
     so ProductPage can run a FLIP animation from this position. */
  const handleProductClick = useCallback((e) => {
    e.preventDefault()
    captureElement(product.id, imageRef.current)
    navigate(`/product/${product.id}`)
  }, [product.id, navigate])

  return (
    <article
      className={`product-card group ${isMasonry ? 'product-card-masonry' : ''}`}
      style={isMasonry ? { '--masonry-index': index % 6 } : undefined}
    >
      <div className={`product-media ${isMasonry ? 'product-media-masonry' : ''}`}>
        <Link to={`/product/${product.id}`} className="block h-full" onClick={handleProductClick}>
          {!imageLoaded && (
            <div className="absolute inset-0 bg-white" />
          )}
          <img
            ref={imageRef}
            src={product.images[0]}
            alt={product.name}
            width="800"
            height="1067"
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }
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
      </div>

      <div className="product-card-meta">
        <Link to={`/product/${product.id}`}>
          <h3 className="product-title break-words">
            {product.name}
          </h3>
        </Link>
        <p className="product-price">
          {formatPrice(product.price, product.currency)}
        </p>
      </div>
    </article>
  )
}
