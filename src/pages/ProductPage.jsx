import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion as framerMotion } from 'framer-motion'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProduct } from '../hooks/useProduct'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useToast } from '../context/ToastContext'
import { formatPrice } from '../utils/formatPrice'
import { imageThumbUrl } from '../utils/imageThumb'
import Button from '../components/ui/Button'
import AnimatedNumber, { AnimatedCurrency } from '../components/ui/AnimatedNumber'
import LazyThreeScene from '../components/three/LazyThreeScene'
import ThreeModelPlaceholder from '../components/three/ThreeModelPlaceholder'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const ProductViewer = lazy(() => import('../components/three/ProductViewer'))

const MotionDiv = framerMotion.div
const GALLERY_THUMB_WIDTH = 160
const GALLERY_THUMB_QUALITY = 42

/* const sharedImageTransition = {
  layout: {
    duration: 0.68,
    ease: [0.22, 1, 0.36, 1],
  },
  opacity: {
    duration: 0,
  },
} */

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

function ImageGallery({ images, thumbnails = [], name }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [imageRatios, setImageRatios] = useState({})
  const [thumbnailFallbacks, setThumbnailFallbacks] = useState({})
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

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
            <img
              src={thumbnailFallbacks[i] ? img : (thumbnails[i] || imageThumbUrl(img, {
                width: GALLERY_THUMB_WIDTH,
                quality: GALLERY_THUMB_QUALITY,
              }))}
              alt=""
              width={GALLERY_THUMB_WIDTH}
              height={GALLERY_THUMB_WIDTH}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority="low"
              decoding="async"
              onLoad={event => {
                const { naturalWidth, naturalHeight } = event.currentTarget
                if (naturalWidth && naturalHeight) {
                  setImageRatios(p => (p[i] ? p : { ...p, [i]: `${naturalWidth} / ${naturalHeight}` }))
                }
              }}
              onError={() => {
                setThumbnailFallbacks(p => (p[i] ? p : { ...p, [i]: true }))
              }}
            />
          </button>
        ))}
      </div>
      <MotionDiv
        /* layout */
        /* layoutId={activeIndex === 0 ? `product-media-${productId}` : undefined} */
        className="product-gallery-frame"
        /* transition={sharedImageTransition} */
        /* initial={false} */
        /* animate={{ opacity: 1, borderRadius: 0 }} */
        /* exit={{ opacity: 1 }} */
        style={{
          opacity: 1,
          ...(imageRatios[activeIndex] ? { '--active-image-ratio': imageRatios[activeIndex] } : {}),
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          key={images[activeIndex]}
          src={images[activeIndex]}
          alt={name}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onLoad={event => {
            const { naturalWidth, naturalHeight } = event.currentTarget
            if (naturalWidth && naturalHeight) {
              setImageRatios(p => ({ ...p, [activeIndex]: `${naturalWidth} / ${naturalHeight}` }))
            }
          }}
        />
        {images.length > 1 && (
          <p className="product-gallery-count" aria-live="polite">
            <AnimatedNumber value={activeIndex + 1} aria-label={`Image ${activeIndex + 1}`} /> / <AnimatedNumber value={images.length} aria-label={`${images.length} images`} />
          </p>
        )}
      </MotionDiv>
    </div>
  )
}

function ProductActionControls({
  product,
  wishlisted,
  onAddToCart,
  onToggleWishlist,
  active = true,
  /* layoutId, */
  className = '',
}) {
  const isOutOfStock = product.stock_quantity <= 0 || product.stock <= 0

  return (
    <MotionDiv
      /* layout */
      /* layoutId={active ? layoutId : undefined} */
      className={`product-actions ${className} ${active ? 'is-active' : 'is-inactive'}`}
      /* transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} */
      aria-hidden={!active}
    >
      <Button onClick={onAddToCart} className={`product-add-button ${isOutOfStock ? 'is-out-of-stock' : ''}`} disabled={isOutOfStock}>
        {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
      </Button>
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
    </MotionDiv>
  )
}

export default function ProductPage({ isOverlay = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { product, loading } = useProduct(id)
  const { addItem } = useCart()
  const { isInWishlist, toggleItem } = useWishlist()
  const { addToast } = useToast()
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [activeTab, setActiveTab] = useState('photos')
  const [isSticky, setIsSticky] = useState(false)
  const actionContainerRef = useRef(null)
  // const actionLayoutId = product ? `product-actions-${product.id}` : undefined

  useEffect(() => {
    // Only apply sticky behavior on mobile
    if (window.innerWidth >= 768) return

    if (!actionContainerRef.current || !('IntersectionObserver' in window)) return

    const updateInitialPosition = () => {
      const rect = actionContainerRef.current?.getBoundingClientRect()
      if (!rect) return
      setIsSticky(rect.top < 0 || rect.bottom > window.innerHeight)
    }

    const frame = window.requestAnimationFrame(updateInitialPosition)

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting)
      },
      { threshold: 0.98 }
    )

    observer.observe(actionContainerRef.current)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [product])

  if (loading) return (
    <div className="page-shell page-top product-page-loading pb-16 md:pb-20" aria-busy="true" />
  )

  if (!product) return (
    <div className="page-shell page-top pb-16 text-center md:pb-20">
      <h1 className="page-title mb-4">Product Not Found</h1>
      <Link to="/shop" className="pressable label-text-compact text-[var(--color-secondary)] underline underline-offset-4">Return to Shop</Link>
    </div>
  )

  const wishlisted = isInWishlist(product.id)
  const handleAddToCart = () => {
    if (product.stock_quantity <= 0 || product.stock <= 0) {
      addToast(`${product.name} is out of stock`)
      return
    }
    addItem(product, selectedVariant)
    addToast(`${product.name} added to cart`)
  }

  const handleClose = () => {
    navigate(-1)
  }

  return (
    <div className={`product-page page-shell page-top pb-16 md:pb-20 ${isOverlay ? 'product-page-overlay' : ''}`}>
      <div className="product-page-topbar">
        <nav className="product-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><Link to="/" className="pressable" viewTransition>Home</Link></li>
            <li>/</li>
            <li><Link to="/shop" className="pressable" viewTransition>Shop</Link></li>
            <li>/</li>
            <li>{product.name}</li>
          </ol>
        </nav>
        <button
          onClick={handleClose}
          className="pressable icon-button product-close-button"
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

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
            <ImageGallery images={product.images} thumbnails={product.image_thumbnails} name={product.name} />
          ) : (
            <div className="product-gallery-frame">
              <Suspense fallback={<LoadingSpinner className="product-media-loader" label="Loading product model" size={32} />}>
                <LazyThreeScene
                  fallback={<ThreeModelPlaceholder variant="product" label="Loading product model" size={32} />}
                  poster={product.model_poster_url || product.fallback_image_url || product.images[0]}
                  variant="product"
                  label="Loading product model"
                >
                  <ProductViewer
                    modelUrl={product.model_url}
                    modelLiteUrl={product.model_lite_url}
                    modelVersion={product.model_version || product.updated_at}
                    modelScale={product.model_scale}
                    modelRotation={product.model_rotation}
                    modelCamera={product.model_camera}
                    fallbackImage={product.model_poster_url || product.fallback_image_url || product.images[0]}
                  />
                </LazyThreeScene>
              </Suspense>
            </div>
          )}
        </div>

        <div className="product-info-panel">
          <p className="product-detail-category">{product.category}</p>
          <h1 className="product-detail-title">{product.name}</h1>
          <p className="product-detail-price">
            <AnimatedCurrency value={product.price} currency={product.currency} aria-label={formatPrice(product.price, product.currency)} />
          </p>

          <div ref={actionContainerRef} className="product-actions-container">
            <ProductActionControls
              product={product}
              wishlisted={wishlisted}
              onAddToCart={handleAddToCart}
              onToggleWishlist={toggleItem}
              active={!isSticky}
              /* layoutId={actionLayoutId} */
              className="product-actions-responsive product-actions-inline"
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
              <p className="product-spec-value tabular-nums">
                {product.stock > 0 ? <AnimatedNumber value={product.stock} suffix=" in stock" /> : 'Out of stock'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ProductActionControls
        product={product}
        wishlisted={wishlisted}
        onAddToCart={handleAddToCart}
        onToggleWishlist={toggleItem}
        active={isSticky}
        /* layoutId={actionLayoutId} */
        className="product-actions-responsive product-actions-fixed"
      />
    </div>
  )
}
