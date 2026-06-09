import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion as framerMotion } from 'framer-motion'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProduct } from '../hooks/useProduct'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useToast } from '../context/ToastContext'
import { formatPrice } from '../utils/formatPrice'
import {
  imageLqipUrl,
  imageThumbUrl,
  imageDisplayUrl,
  imageSrcSet,
  markSupabaseTransformsBroken,
  useSupabaseTransformsAvailable,
} from '../utils/imageThumb'
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

function FixedGalleryLoader({ bounds, label }) {
  if (typeof document === 'undefined' || !bounds) return null

  return createPortal(
    <div
      className="product-gallery-loader-fixed"
      aria-hidden="true"
      style={{
        '--gallery-loader-left': `${bounds.left}px`,
        '--gallery-loader-top': `${bounds.top}px`,
        '--gallery-loader-width': `${bounds.width}px`,
        '--gallery-loader-height': `${bounds.height}px`,
      }}
    >
      <LoadingSpinner label={label} size={32} />
    </div>,
    document.body,
  )
}

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

function ImageGallery({ images, thumbnails = [], dimensions = [], name }) {
  const galleryFrameRef = useRef(null)
  const transformsAvailable = useSupabaseTransformsAvailable()
  const [activeIndex, setActiveIndex] = useState(0)
  const [imageRatios, setImageRatios] = useState({})
  const [thumbnailFallbacks, setThumbnailFallbacks] = useState({})
  const [previewFallbacks, setPreviewFallbacks] = useState({})
  const [loadedImages, setLoadedImages] = useState({})
  const [settledImages, setSettledImages] = useState({})
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const activeImage = images[activeIndex]
  // Always the pre-uploaded sharp WebP — no render-endpoint round-trip, no
  // first-render flash. If missing or it errors, the main image just fades
  // in cleanly with no backdrop.
  const activeThumbnail = previewFallbacks[activeIndex] ? null : thumbnails[activeIndex] || null
  const activeImageLoaded = loadedImages[activeImage] === true
  const activeImageSettled = settledImages[activeImage] === true
  const [loaderBounds, setLoaderBounds] = useState(null)

  // Stage gallery preloads: the active image + its immediate neighbours fetch
  // now; everything else waits until the user navigates to it. The old code
  // dispatched every image in parallel which starved bandwidth from the active
  // one on slow connections.
  useEffect(() => {
    if (!images.length) return undefined
    let cancelled = false
    const neighbourIndexes = new Set([
      activeIndex,
      (activeIndex + 1) % images.length,
      (activeIndex - 1 + images.length) % images.length,
    ])
    const preloaders = []
    neighbourIndexes.forEach(i => {
      const image = images[i]
      if (!image) return
      const preloader = new Image()
      preloader.decoding = 'async'
      preloader.onerror = () => {
        if (transformsAvailable) markSupabaseTransformsBroken()
      }
      preloader.onload = () => {
        if (cancelled) return
        setLoadedImages(p => (p[image] ? p : { ...p, [image]: true }))
      }
      preloader.src = transformsAvailable ? imageDisplayUrl(image, { width: 1280 }) : image
      if (preloader.complete && preloader.naturalWidth) {
        preloader.onload()
      }
      preloaders.push(preloader)
    })

    return () => {
      cancelled = true
      preloaders.forEach(preloader => {
        preloader.onload = null
        preloader.onerror = null
      })
    }
  }, [images, activeIndex, transformsAvailable])

  useEffect(() => {
    if (!activeImageLoaded || activeImageSettled) return undefined
    const timer = window.setTimeout(() => {
      setSettledImages(p => ({ ...p, [activeImage]: true }))
    }, 800)
    return () => window.clearTimeout(timer)
  }, [activeImage, activeImageLoaded, activeImageSettled])

  useEffect(() => {
    let frame = 0

    if (activeImageSettled) {
      frame = window.requestAnimationFrame(() => setLoaderBounds(null))
      return () => window.cancelAnimationFrame(frame)
    }

    const updateBounds = () => {
      const bounds = galleryFrameRef.current?.getBoundingClientRect()
      if (!bounds) return
      setLoaderBounds({
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      })
    }

    frame = window.requestAnimationFrame(updateBounds)
    window.addEventListener('resize', updateBounds)
    window.addEventListener('scroll', updateBounds, { passive: true })

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', updateBounds)
      window.removeEventListener('scroll', updateBounds)
    }
  }, [activeImageSettled])

  const setImage = index => {
    const nextIndex = (index + images.length) % images.length
    const nextImage = images[nextIndex]
    if (loadedImages[nextImage]) {
      setSettledImages(p => (p[nextImage] ? p : { ...p, [nextImage]: true }))
    }
    setActiveIndex(nextIndex)
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
              onError={event => {
                if (thumbnailFallbacks[i]) {
                  event.currentTarget.style.display = 'none'
                  return
                }
                setThumbnailFallbacks(p => (p[i] ? p : { ...p, [i]: true }))
              }}
            />
          </button>
        ))}
      </div>
      <MotionDiv
        ref={galleryFrameRef}
        /* layout */
        /* layoutId={activeIndex === 0 ? `product-media-${productId}` : undefined} */
        className="product-gallery-frame"
        /* transition={sharedImageTransition} */
        /* initial={false} */
        /* animate={{ opacity: 1, borderRadius: 0 }} */
        /* exit={{ opacity: 1 }} */
        style={(() => {
          // Stored dimensions win — they pin the frame's aspect ratio before
          // the full image loads, killing the "frame snaps to ratio" jump.
          // Fall back to the post-load measurement for legacy products.
          const stored = dimensions[activeIndex]
          const ratio = stored?.width && stored?.height
            ? `${stored.width} / ${stored.height}`
            : imageRatios[activeIndex]
          return ratio ? { opacity: 1, '--active-image-ratio': ratio } : { opacity: 1 }
        })()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {activeThumbnail && (
          <img
            key={`preview-${activeImage}`}
            className={activeImageSettled ? 'product-gallery-preview is-loaded' : 'product-gallery-preview'}
            src={activeThumbnail}
            alt=""
            width={GALLERY_THUMB_WIDTH}
            height={GALLERY_THUMB_WIDTH}
            aria-hidden="true"
            decoding="async"
            onError={() => {
              setPreviewFallbacks(p => (p[activeIndex] ? p : { ...p, [activeIndex]: true }))
            }}
          />
        )}
        <img
          key={activeImage}
          className={activeImageLoaded ? 'product-gallery-image is-loaded' : 'product-gallery-image is-loading'}
          src={transformsAvailable ? imageDisplayUrl(activeImage, { width: 1280 }) : activeImage}
          srcSet={transformsAvailable ? imageSrcSet(activeImage, { widths: [640, 960, 1280, 1600, 2048] }) : undefined}
          sizes={transformsAvailable ? '(max-width: 880px) 100vw, (max-width: 1280px) 60vw, 50vw' : undefined}
          alt={name}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onLoad={event => {
            const { naturalWidth, naturalHeight } = event.currentTarget
            if (naturalWidth && naturalHeight) {
              setImageRatios(p => ({ ...p, [activeIndex]: `${naturalWidth} / ${naturalHeight}` }))
            }
            setLoadedImages(p => ({ ...p, [activeImage]: true }))
          }}
          onError={event => {
            if (transformsAvailable) {
              markSupabaseTransformsBroken()
              return
            }
            event.currentTarget.style.display = 'none'
            setLoadedImages(p => ({ ...p, [activeImage]: true }))
          }}
        />
        {!activeImageSettled && (
          <FixedGalleryLoader bounds={loaderBounds} label="Loading product image" />
        )}
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
  const { product, loading, error } = useProduct(id)
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
    <div className="page-shell page-top product-page-loading pb-16 md:pb-20" aria-busy="true">
      <LoadingSpinner label="Loading product" size={32} />
    </div>
  )

  if (error) return (
    <div className="page-shell page-top pb-16 text-center md:pb-20">
      <h1 className="page-title mb-4">Product could not be loaded</h1>
      <p className="mb-6 text-base text-[var(--color-secondary)]">Refresh to try again.</p>
      <Link to="/shop" className="pressable label-text-compact text-[var(--color-secondary)] underline underline-offset-4">Return to Shop</Link>
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
            <ImageGallery
              images={product.images}
              thumbnails={product.image_thumbnails}
              dimensions={product.image_dimensions}
              name={product.name}
            />
          ) : (
            <div className="product-gallery-frame">
              <Suspense fallback={(
                <div className="product-media-loader">
                  <LoadingSpinner label="Loading product model" size={32} />
                </div>
              )}>
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
                    modelLightPosition={product.model_light_position}
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
