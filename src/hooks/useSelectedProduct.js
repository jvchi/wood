import { useCallback, useEffect, useMemo, useState } from 'react'

export function useSelectedProduct(products) {
  const [selectedProductId, setSelectedProductId] = useState(null)

  const selectedProduct = useMemo(
    () => products.find(product => product.id === selectedProductId) || null,
    [products, selectedProductId],
  )

  const openProduct = useCallback(product => {
    setSelectedProductId(product.id)
  }, [])

  const closeProduct = useCallback(() => {
    setSelectedProductId(null)
  }, [])

  useEffect(() => {
    if (!selectedProductId) return undefined

    const handleKeyDown = event => {
      if (event.key === 'Escape') closeProduct()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeProduct, selectedProductId])

  return {
    selectedProduct,
    selectedProductId,
    openProduct,
    closeProduct,
  }
}
