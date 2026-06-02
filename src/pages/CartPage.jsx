import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/formatPrice'
import Button from '../components/ui/Button'
import AnimatedNumber, { AnimatedCurrency } from '../components/ui/AnimatedNumber'

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart()

  if (items.length === 0) {
    return (
      <div className="page-shell page-top pb-16 text-center md:pb-20">
        <h1 className="mb-6 text-[var(--font-size-xl)] font-bold uppercase">Your Cart</h1>
        <p className="mb-10 text-base text-[var(--color-secondary)]">Your cart is empty.</p>
        <Link to="/shop"><Button variant="secondary">Explore Collection</Button></Link>
      </div>
    )
  }

  return (
    <div className="page-shell page-top cart-page pb-16 md:pb-20">
      <h1 className="page-title mb-10 md:mb-12">
        Cart <span className="align-baseline text-[var(--font-size-sm)] text-[var(--color-secondary)] tabular-nums">(<AnimatedNumber value={totalItems} aria-label={`${totalItems} cart items`} />)</span>
      </h1>

      <div className="space-y-3">
          {items.map(item => (
            <div key={item.key} className="cart-item">
              <Link to={`/product/${item.product.id}`} className="cart-item-image">
                <img src={item.product.images[0]} alt={item.product.name} width="256" height="320" className="cart-item-thumb" loading="lazy" />
              </Link>

              <div className="min-w-0 flex-1 flex flex-col justify-between">
                <div className="min-w-0">
                  <Link to={`/product/${item.product.id}`}>
                    <h3 className="product-title break-words">{item.product.name}</h3>
                  </Link>
                  {item.variant && <p className="meta-text mt-1">{item.variant}</p>}
                  <p className="product-price mt-2">{formatPrice(item.product.price, item.product.currency)}</p>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="cart-quantity">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.key, item.quantity - 1)}
                      className="pressable icon-button text-[var(--color-primary)]"
                      aria-label="Decrease quantity">−</button>
                    <span className="product-price w-9 text-center">
                      <AnimatedNumber value={item.quantity} aria-label={`${item.quantity} quantity`} />
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.key, item.quantity + 1)}
                      className="pressable icon-button text-[var(--color-primary)]"
                      aria-label="Increase quantity">+</button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    className="pressable label-text-compact self-start text-[var(--color-secondary)]"
                    aria-label={`Remove ${item.product.name} from cart`}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        <div className="cart-summary-bar">
          <div className="cart-summary bg-white">
            <h2 className="label-text-compact mb-6 text-[var(--color-muted)]">Order Summary</h2>
            <div className="cart-summary-lines">
              <div className="summary-row flex justify-between gap-4">
                <span>Subtotal</span>
                <span className="text-[var(--color-primary)] tabular-nums">
                  <AnimatedCurrency value={totalPrice} aria-label={formatPrice(totalPrice)} />
                </span>
              </div>
              <div className="summary-row flex justify-between gap-4">
                <span>Shipping</span>
                <span className="text-right">At checkout</span>
              </div>
            </div>
            <div className="cart-summary-total">
              <div className="flex justify-between">
                <span className="summary-total">Total</span>
                <span className="summary-total">
                  <AnimatedCurrency value={totalPrice} aria-label={formatPrice(totalPrice)} />
                </span>
              </div>
            </div>
            <Button className="w-full">Checkout</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
