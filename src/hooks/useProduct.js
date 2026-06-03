import { useEffect, useMemo, useState } from 'react'
import { getCachedProducts, getProduct, PRODUCT_EVENT } from '../lib/productStore'

export function useProduct(id) {
  const cachedProduct = useMemo(() => {
    if (!id) return null
    return getCachedProducts()?.find(product => product.id === id) || null
  }, [id])
  const [product, setProduct] = useState(cachedProduct)
  const [loading, setLoading] = useState(() => !cachedProduct)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadProduct({ force = false } = {}) {
      if (!id) {
        setProduct(null)
        setLoading(false)
        return
      }

      if (!force && cachedProduct) {
        setProduct(cachedProduct)
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const nextProduct = await getProduct(id, { force })
        if (!cancelled) setProduct(nextProduct)
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProduct()

    const refresh = () => loadProduct({ force: true })
    window.addEventListener(PRODUCT_EVENT, refresh)
    window.addEventListener('storage', refresh)

    return () => {
      cancelled = true
      window.removeEventListener(PRODUCT_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [cachedProduct, id])

  return { product, loading, error }
}
