import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/formatPrice'
import Button from '../components/ui/Button'

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart()

  if (items.length === 0) {
    return (
      <div className="page-shell page-top pb-16 text-center md:pb-20">
        <h1 className="page-title mb-5">Your Cart</h1>
        <p className="body-copy mx-auto mb-10">Your cart is empty.</p>
        <Link to="/shop"><Button variant="secondary">Continue Shopping</Button></Link>
      </div>
    )
  }

  return (
    <div className="page-shell page-top pb-16 md:pb-20">
      <h1 className="page-title mb-10 md:mb-12">
        Cart <span className="align-baseline text-[var(--font-size-sm)] text-[var(--color-secondary)] tabular-nums">({totalItems})</span>
      </h1>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-16">
        <div className="lg:col-span-2 space-y-0">
          {items.map(item => (
            <div key={item.key} className="flex gap-4 border-b border-[var(--color-border)] py-6 md:gap-6 md:py-8">
              <Link to={`/product/${item.product.id}`} className="h-32 w-24 shrink-0 overflow-hidden bg-[var(--color-surface)] md:h-40 md:w-32">
                <img src={item.product.images[0]} alt={item.product.name} width="256" height="320" className="h-full w-full object-cover" loading="lazy" />
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
                  <div className="flex items-center border border-[var(--color-border)]">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.key, item.quantity - 1)}
                      className="pressable icon-button text-[var(--color-primary)]"
                      aria-label="Decrease quantity">−</button>
                    <span className="product-price w-9 text-center">{item.quantity}</span>
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
        </div>

        <div className="h-fit lg:sticky lg:top-24">
          <div className="border border-[var(--color-border)] bg-white p-6 md:p-8">
            <h2 className="label-text-compact mb-6 text-[var(--color-muted)]">Order Summary</h2>
            <div className="space-y-3 mb-8">
              <div className="summary-row flex justify-between gap-4">
                <span>Subtotal</span>
                <span className="text-[var(--color-primary)] tabular-nums">{formatPrice(totalPrice)}</span>
              </div>
              <div className="summary-row flex justify-between gap-4">
                <span>Shipping</span>
                <span className="text-right">At checkout</span>
              </div>
            </div>
            <div className="mb-8 border-t border-[var(--color-border)] pt-4">
              <div className="flex justify-between">
                <span className="summary-total">Total</span>
                <span className="summary-total">{formatPrice(totalPrice)}</span>
              </div>
            </div>
            <Button className="w-full">Checkout</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
