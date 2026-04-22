import { useMemo } from 'react'
import { useProducts } from './useProducts'

export function useProduct(id) {
  const { products, loading } = useProducts()

  const product = useMemo(() => {
    if (loading) return null
    return products.find(p => p.id === id) || null
  }, [id, loading, products])

  return { product, loading }
}
