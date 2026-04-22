/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const [items, setItems] = useState([])

  const toggleItem = useCallback((product) => {
    setItems(prev => {
      const exists = prev.find(i => i.id === product.id)
      if (exists) return prev.filter(i => i.id !== product.id)
      return [...prev, product]
    })
  }, [])

  const isInWishlist = useCallback(
    (productId) => items.some(i => i.id === productId),
    [items]
  )

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(i => i.id !== productId))
  }, [])

  return (
    <WishlistContext.Provider value={{ items, toggleItem, isInWishlist, removeItem }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
