import { Link } from 'react-router-dom'
import { useWishlist } from '../context/WishlistContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { formatPrice } from '../utils/formatPrice'
import Button from '../components/ui/Button'

export default function WishlistPage() {
  const { items, removeItem } = useWishlist()
  const { addItem } = useCart()
  const { addToast } = useToast()

  if (items.length === 0) {
    return (
      <div className="page-shell page-top pb-16 text-center md:pb-20">
        <h1 className="mb-6 text-[var(--font-size-xl)] font-bold uppercase">Wishlist</h1>
        <p className="mb-10 text-base text-[var(--color-secondary)]">Your wishlist is empty.</p>
        <Link to="/shop"><Button variant="secondary">Explore Collection</Button></Link>
      </div>
    )
  }

  return (
    <div className="page-shell page-top pb-16 md:pb-20">
      <h1 className="mb-10 text-[var(--font-size-xl)] font-bold uppercase md:mb-12">
        Wishlist <span className="text-[var(--font-size-base)] text-[var(--color-secondary)] tabular-nums">({items.length})</span>
      </h1>

      <div className="wishlist-grid">
        {items.map(product => (
          <article key={product.id} className="group">
            <Link to={`/product/${product.id}`} className="block">
              <div className="product-media">
                <img src={product.images[0]} alt={product.name} width="800" height="1067" loading="lazy" className="h-full w-full object-cover" />
              </div>
            </Link>
            <div className="mt-2 min-w-0 space-y-0.5">
              <h3 className="product-title break-words">{product.name}</h3>
              <p className="product-price">{formatPrice(product.price, product.currency)}</p>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => { addItem(product); addToast(`${product.name} added to cart`) }}>
                Add to Cart
              </Button>
              <button
                type="button"
                onClick={() => removeItem(product.id)}
                className="pressable icon-button text-[var(--color-secondary)]"
                aria-label={`Remove ${product.name}`}>×</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
