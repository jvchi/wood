import { useEffect, useState } from 'react'
import { listProducts, PRODUCT_EVENT } from '../lib/productStore'

export function useProducts(options = {}) {
  const includeUnpublished = options.includeUnpublished === true
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      setLoading(true)
      setError(null)
      try {
        const nextProducts = await listProducts({ includeUnpublished })
        if (!cancelled) setProducts(nextProducts)
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProducts()

    const refresh = () => loadProducts()
    window.addEventListener(PRODUCT_EVENT, refresh)
    window.addEventListener('storage', refresh)

    return () => {
      cancelled = true
      window.removeEventListener(PRODUCT_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [includeUnpublished])

  return { products, loading, error }
}
