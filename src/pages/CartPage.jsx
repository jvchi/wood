import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { animate, motion as Motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/formatPrice'
import Button from '../components/ui/Button'
import AnimatedNumber, { AnimatedCurrency } from '../components/ui/AnimatedNumber'
import { PRODUCT_PLACEHOLDER_IMAGE } from '../lib/productStore'

const SWIPE_ACTION_WIDTH = 88
const FULL_SWIPE_VELOCITY = -760
const OPEN_SWIPE_VELOCITY = -180

function useIsMobileCart() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px)').matches
  })

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(query.matches)

    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return isMobile
}

function CartItem({ item, removeItem, updateQuantity }) {
  const [isRemoving, setIsRemoving] = useState(false)
  const rowRef = useRef(null)
  const x = useMotionValue(0)
  const isMobile = useIsMobileCart()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!isMobile) {
      x.set(0)
    }
  }, [isMobile, x])

  const springTo = (value) => {
    if (reduceMotion) {
      x.set(value)
      return { stop: () => {} }
    }

    return animate(x, value, {
      type: 'spring',
      stiffness: 720,
      damping: 54,
      mass: 0.7,
      velocity: x.getVelocity(),
    })
  }

  const dismiss = () => {
    if (isRemoving) return

    setIsRemoving(true)
    const rowWidth = rowRef.current?.offsetWidth || window.innerWidth

    if (reduceMotion) {
      removeItem(item.key)
      return
    }

    animate(x, -rowWidth - SWIPE_ACTION_WIDTH, {
      type: 'spring',
      stiffness: 760,
      damping: 58,
      mass: 0.68,
      velocity: Math.min(x.getVelocity(), FULL_SWIPE_VELOCITY),
    })

    window.setTimeout(() => removeItem(item.key), 180)
  }

  const handleQuantityChange = (quantity) => {
    springTo(0)
    updateQuantity(item.key, quantity)
  }

  const handleDragEnd = (_, info) => {
    const rowWidth = rowRef.current?.offsetWidth || window.innerWidth
    const currentX = x.get()
    const fullSwipeDistance = rowWidth * 0.52

    if (currentX <= -fullSwipeDistance || info.velocity.x <= FULL_SWIPE_VELOCITY) {
      dismiss()
      return
    }

    if (currentX <= -44 || info.velocity.x <= OPEN_SWIPE_VELOCITY) {
      springTo(-SWIPE_ACTION_WIDTH)
      return
    }

    springTo(0)
  }

  return (
    <Motion.div
      layout={!reduceMotion}
      className="cart-swipe-row"
      animate={isRemoving && !reduceMotion ? { opacity: 0, height: 0, marginBottom: 0 } : undefined}
      transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.85 }}
    >
      <div className="cart-swipe-action" aria-hidden={!isMobile}>
        <button
          type="button"
          onClick={dismiss}
          className="cart-swipe-delete"
          aria-label={`Remove ${item.product.name} from cart`}
          tabIndex={isMobile ? 0 : -1}
        >
          Delete
        </button>
      </div>

      <Motion.div
        ref={rowRef}
        className="cart-item"
        style={{ x }}
        drag={isMobile && !isRemoving ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: -1000, right: 0 }}
        dragElastic={{ left: 0.08, right: 0.02 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
      >
        <Link to={`/product/${item.product.id}`} className="cart-item-image" draggable="false">
          <img
            src={item.product.images[0]}
            alt={item.product.name}
            width="256"
            height="320"
            className="cart-item-thumb"
            loading="lazy"
            draggable="false"
            onError={event => {
              if (event.currentTarget.src !== PRODUCT_PLACEHOLDER_IMAGE) {
                event.currentTarget.src = PRODUCT_PLACEHOLDER_IMAGE
              }
            }}
          />
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
            <div className="cart-quantity" onPointerDownCapture={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={() => handleQuantityChange(item.quantity - 1)}
                className="pressable icon-button cart-quantity-button text-[var(--color-primary)]"
                aria-label="Decrease quantity">−</button>
              <span className="product-price w-9 text-center">
                <AnimatedNumber value={item.quantity} aria-label={`${item.quantity} quantity`} />
              </span>
              <button
                type="button"
                onClick={() => handleQuantityChange(item.quantity + 1)}
                className="pressable icon-button cart-quantity-button text-[var(--color-primary)]"
                aria-label="Increase quantity">+</button>
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.key)}
              className="pressable label-text-compact cart-remove-button self-start text-[var(--color-secondary)]"
              aria-label={`Remove ${item.product.name} from cart`}>Remove</button>
          </div>
        </div>
      </Motion.div>
    </Motion.div>
  )
}

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
            <CartItem
              key={item.key}
              item={item}
              removeItem={removeItem}
              updateQuantity={updateQuantity}
            />
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
