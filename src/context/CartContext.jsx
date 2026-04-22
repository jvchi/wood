/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

  const addItem = useCallback((product, variant = null) => {
    setItems(prev => {
      const key = variant ? `${product.id}-${variant}` : product.id
      const existing = prev.find(i => i.key === key)
      if (existing) {
        return prev.map(i =>
          i.key === key ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { key, product, variant, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((key) => {
    setItems(prev => prev.filter(i => i.key !== key))
  }, [])

  const updateQuantity = useCallback((key, quantity) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.key !== key))
      return
    }
    setItems(prev =>
      prev.map(i => (i.key === key ? { ...i, quantity } : i))
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  )

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
