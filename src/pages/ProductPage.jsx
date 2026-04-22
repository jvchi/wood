import { useState, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useProduct } from '../hooks/useProduct'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useToast } from '../context/ToastContext'
import { formatPrice } from '../utils/formatPrice'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import ProductViewer from '../components/three/ProductViewer'

function ImageGallery({ images, name }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [loaded, setLoaded] = useState({})

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      <div className="flex gap-3 overflow-x-auto md:flex-col md:overflow-visible">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`pressable h-20 w-16 shrink-0 overflow-hidden border md:h-24 md:w-20 ${
              activeIndex === i ? 'border-[var(--color-primary)] opacity-100' : 'border-transparent opacity-55'
            }`}
            aria-label={`View image ${i + 1}`}
          >
            <img src={img} alt="" width="160" height="200" className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      <div className="relative aspect-[3/4] flex-1 overflow-hidden bg-[var(--color-surface)] md:aspect-[4/5]">
        {!loaded[activeIndex] && <div className="absolute inset-0 bg-[var(--color-surface-muted)] animate-pulse" />}
        <img
          src={images[activeIndex]}
          alt={name}
          width="900"
          height="1125"
          onLoad={() => setLoaded(p => ({ ...p, [activeIndex]: true }))}
          className={`h-full w-full object-cover transition-opacity duration-[180ms] ease-[var(--ease-out)] ${loaded[activeIndex] ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
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

  return (
    <div className="page-shell page-top pb-16 md:pb-20">
      <nav className="mb-8" aria-label="Breadcrumb">
        <ol className="meta-text flex flex-wrap items-center gap-2">
          <li><Link to="/" className="pressable">Home</Link></li>
          <li>/</li>
          <li><Link to="/shop" className="pressable">Shop</Link></li>
          <li>/</li>
          <li className="text-[var(--color-primary)]">{product.name}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="mb-4 flex gap-4">
            {['photos', '3d'].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pressable label-text-compact min-h-11 ${activeTab === tab ? 'text-[var(--color-primary)] underline underline-offset-4' : 'text-[var(--color-secondary)]'}`}
              >
                {tab === '3d' ? '3D View' : 'Photos'}
              </button>
            ))}
          </div>
          {activeTab === 'photos' ? (
            <ImageGallery images={product.images} name={product.name} />
          ) : (
            <div className="aspect-[3/4] md:aspect-[4/5]">
              <Suspense fallback={<Skeleton className="w-full h-full" />}>
                <ProductViewer />
              </Suspense>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:h-fit lg:pt-4">
          <p className="label-text-compact mb-3 text-[var(--color-muted)]">{product.category}</p>
          <h1 className="page-title mb-4">{product.name}</h1>
          <p className="summary-total mb-8">{formatPrice(product.price, product.currency)}</p>
          <p className="body-copy mb-10">{product.description}</p>

          {product.variants?.length > 0 && (
            <div className="mb-8">
              <p className="label-text-compact mb-4 text-[var(--color-muted)]">Variant</p>
              <div className="flex flex-wrap gap-3">
                {product.variants.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className={`pressable label-text-compact min-h-11 border px-5 py-2 ${
                      selectedVariant === v ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] text-[var(--color-secondary)]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-10 flex gap-3">
            <Button onClick={() => { addItem(product, selectedVariant); addToast(`${product.name} added to cart`) }} className="flex-1">Add to Cart</Button>
            <button
              type="button"
              onClick={() => toggleItem(product)}
              className={`pressable icon-button wishlist-toggle relative border border-[var(--color-border)] ${wishlisted ? 'is-active' : ''}`}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={wishlisted}
            >
              <span className="sr-only">{wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}</span>
              <svg className="heart-icon heart-outline" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <svg className="heart-icon heart-filled" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="var(--color-primary)" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
          </div>

          <div className="space-y-6 border-t border-[var(--color-border)] pt-8">
            {product.dimensions && (
              <div>
                <p className="label-text-compact mb-2 text-[var(--color-muted)]">Dimensions</p>
                <p className="meta-text text-[var(--color-primary)] tabular-nums">{product.dimensions.width}W × {product.dimensions.depth}D × {product.dimensions.height}H cm</p>
              </div>
            )}
            {product.materials && (
              <div>
                <p className="label-text-compact mb-2 text-[var(--color-muted)]">Materials</p>
                <p className="meta-text text-[var(--color-primary)]">{product.materials.join(', ')}</p>
              </div>
            )}
            <div>
              <p className="label-text-compact mb-2 text-[var(--color-muted)]">Availability</p>
              <p className="meta-text text-[var(--color-primary)] tabular-nums">{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
