import { useEffect, useState } from 'react'
import { getCachedProducts, listProducts, PRODUCT_EVENT } from '../lib/productStore'

export function useProducts(options = {}) {
  const includeUnpublished = options.includeUnpublished === true
  const cachedProducts = getCachedProducts({ includeUnpublished })
  const [products, setProducts] = useState(() => cachedProducts || [])
  const [loading, setLoading] = useState(() => !cachedProducts)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadProducts({ force = false } = {}) {
      const cached = !force ? getCachedProducts({ includeUnpublished }) : null
      if (cached) {
        setProducts(cached)
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const nextProducts = await listProducts({ includeUnpublished, force })
        if (!cancelled) setProducts(nextProducts)
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProducts()

    const refresh = () => loadProducts()
    const refreshFromStorage = () => loadProducts({ force: true })
    window.addEventListener(PRODUCT_EVENT, refresh)
    window.addEventListener('storage', refreshFromStorage)

    return () => {
      cancelled = true
      window.removeEventListener(PRODUCT_EVENT, refresh)
      window.removeEventListener('storage', refreshFromStorage)
    }
  }, [includeUnpublished])

  return { products, loading, error }
}
