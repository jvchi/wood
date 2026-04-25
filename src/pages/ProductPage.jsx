import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useProduct } from '../hooks/useProduct'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useToast } from '../context/ToastContext'
import { formatPrice } from '../utils/formatPrice'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import ProductViewer from '../components/three/ProductViewer'

import { useSharedHeroTransition } from '../hooks/useSharedHeroTransition'

function HeartIcon({ filled = false }) {
  return (
    <svg
      className={`heart-icon ${filled ? 'heart-filled' : 'heart-outline'}`}
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'var(--color-primary)' : 'none'}
      stroke="var(--color-primary)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function ImageGallery({ images, name, productId }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [loaded, setLoaded] = useState({})
  const [imageRatios, setImageRatios] = useState({})
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  /* Shared layout animation: FLIP from shop card position → gallery position */
  const heroRef = useSharedHeroTransition(productId, {
    duration: 500,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  })

  const setImage = index => {
    setActiveIndex((index + images.length) % images.length)
  }

  const handleTouchStart = event => {
    const touch = event.touches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
  }

  const handleTouchEnd = event => {
    if (touchStartX.current === null || touchStartY.current === null || images.length < 2) return

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - touchStartX.current
    const deltaY = touch.clientY - touchStartY.current

    touchStartX.current = null
    touchStartY.current = null

    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return
    setImage(deltaX < 0 ? activeIndex + 1 : activeIndex - 1)
  }

  return (
    <div className="product-gallery">
      <div className="product-thumbnails">
        {images.map((img, i) => (
          <button
            key={img}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`pressable product-thumbnail ${activeIndex === i ? 'is-active' : ''}`}
            aria-label={`View image ${i + 1}`}
          >
            <img src={img} alt="" width="160" height="200" loading="lazy" />
          </button>
        ))}
      </div>
      <div
        ref={heroRef}
        className="product-gallery-frame"
        style={imageRatios[activeIndex] ? { '--active-image-ratio': imageRatios[activeIndex] } : undefined}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {!loaded[activeIndex] && <div className="absolute inset-0 bg-[var(--color-surface-muted)] animate-pulse" />}
        <img
          src={images[activeIndex]}
          alt={name}
          onLoad={event => {
            const { naturalWidth, naturalHeight } = event.currentTarget
            setLoaded(p => ({ ...p, [activeIndex]: true }))
            if (naturalWidth && naturalHeight) {
              setImageRatios(p => ({ ...p, [activeIndex]: `${naturalWidth} / ${naturalHeight}` }))
            }
          }}
          className={loaded[activeIndex] ? 'opacity-100' : 'opacity-0'}
        />
        {images.length > 1 && (
          <p className="product-gallery-count" aria-live="polite">
            {activeIndex + 1} / {images.length}
          </p>
        )}
      </div>
    </div>
  )
}

function ProductActionControls({
  product,
  wishlisted,
  onAddToCart,
  onToggleWishlist,
  className = '',
}) {
  return (
    <div className={`product-actions ${className}`}>
      <Button onClick={onAddToCart} className="product-add-button">Add to Cart</Button>
      <button
        type="button"
        onClick={() => onToggleWishlist(product)}
        className={`pressable icon-button wishlist-toggle product-action-wishlist ${wishlisted ? 'is-active' : ''}`}
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={wishlisted}
      >
        <span className="sr-only">{wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}</span>
        <HeartIcon />
        <HeartIcon filled />
      </button>
    </div>
  )
}

export default function ProductPage() {
  const { id } = useParams()
  const { product, loading } = useProduct(id)
  const { addItem } = useCart()
  const { isInWishlist, toggleItem } = useWishlist()
  const { addToast } = useToast()
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [activeTab, setActiveTab] = useState('photos')
  const [isSticky, setIsSticky] = useState(false)
  const actionContainerRef = useRef(null)

  useEffect(() => {
    // Only apply sticky behavior on mobile
    if (window.innerWidth >= 768) return

    if (!actionContainerRef.current || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Stick to bottom when not fully visible
        setIsSticky(!entry.isIntersecting)
      },
      { threshold: 1.0 }
    )

    observer.observe(actionContainerRef.current)
    return () => observer.disconnect()
  }, [product])

  if (loading) return (
    <div className="page-shell page-top pb-16 md:pb-20">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <Skeleton className="aspect-[3/4]" />
        <div className="space-y-6"><Skeleton className="h-6 w-48" /><Skeleton className="h-8 w-32" /><Skeleton className="h-20 w-full" /><Skeleton className="h-12 w-full" /></div>
      </div>
    </div>
  )

  if (!product) return (
    <div className="page-shell page-top pb-16 text-center md:pb-20">
      <h1 className="page-title mb-4">Product Not Found</h1>
      <Link to="/shop" className="pressable label-text-compact text-[var(--color-secondary)] underline underline-offset-4">Return to Shop</Link>
    </div>
  )

  const wishlisted = isInWishlist(product.id)
  const handleAddToCart = () => {
    addItem(product, selectedVariant)
    addToast(`${product.name} added to cart`)
  }

  return (
    <div className="product-page page-shell page-top pb-16 md:pb-20">
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><Link to="/" className="pressable">Home</Link></li>
          <li>/</li>
          <li><Link to="/shop" className="pressable">Shop</Link></li>
          <li>/</li>
          <li>{product.name}</li>
        </ol>
      </nav>

      <div className="product-detail-grid">
        <div className="product-media-column">
          <div className="product-view-tabs">
            {['photos', '3d'].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pressable ${activeTab === tab ? 'is-active' : ''}`}
              >
                {tab === '3d' ? '3D View' : 'Photos'}
              </button>
            ))}
          </div>

          {activeTab === 'photos' ? (
            <ImageGallery images={product.images} name={product.name} productId={product.id} />
          ) : (
            <div className="product-gallery-frame">
              <Suspense fallback={<Skeleton className="w-full h-full" />}>
                <ProductViewer />
              </Suspense>
            </div>
          )}
        </div>

        <div className="product-info-panel">
          <p className="product-detail-category">{product.category}</p>
          <h1 className="product-detail-title">{product.name}</h1>
          <p className="product-detail-price">{formatPrice(product.price, product.currency)}</p>

          <div ref={actionContainerRef} className="product-actions-container">
            <ProductActionControls
              product={product}
              wishlisted={wishlisted}
              onAddToCart={handleAddToCart}
              onToggleWishlist={toggleItem}
              className={`product-actions-responsive ${isSticky ? 'is-fixed-bottom' : ''}`}
            />
          </div>
          <p className="product-detail-description">{product.description}</p>

          {product.variants?.length > 0 && (
            <div className="product-detail-section">
              <p className="product-detail-label">Variant</p>
              <div className="product-variant-row">
                {product.variants.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className={`pressable product-variant-option ${selectedVariant === v ? 'is-active' : ''}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="product-spec-list">
            {product.dimensions && (
              <div>
                <p className="product-detail-label">Dimensions</p>
                <p className="product-spec-value tabular-nums">{product.dimensions.width}W x {product.dimensions.depth}D x {product.dimensions.height}H cm</p>
              </div>
            )}
            {product.materials && (
              <div>
                <p className="product-detail-label">Materials</p>
                <p className="product-spec-value">{product.materials.join(', ')}</p>
              </div>
            )}
            <div>
              <p className="product-detail-label">Availability</p>
              <p className="product-spec-value tabular-nums">{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}
