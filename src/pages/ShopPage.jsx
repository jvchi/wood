import { useState, useMemo, startTransition } from 'react'
import { useProducts } from '../hooks/useProducts'
import ProductCard from '../components/ui/ProductCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const ALL_CATEGORY = 'all'
const MOBILE_CATEGORY_LABELS = {
  all: 'all',
  sectionals: 'sect.',
  ottomans: 'otto.',
  benches: 'bench',
}

export default function ShopPage() {
  const { products, loading, error } = useProducts()
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY)

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))]
    return [ALL_CATEGORY, ...cats]
  }, [products])

  const filtered = useMemo(() => {
    if (activeCategory === ALL_CATEGORY) return products
    return products.filter(p => p.category === activeCategory)
  }, [products, activeCategory])

  if (loading) return (
    <div className="shop-page page-shell page-top shop-page-loading pb-16 md:pb-20" aria-busy="true">
      <LoadingSpinner label="Loading shop products" size={32} />
    </div>
  )

  return (
    <div className="shop-page page-shell page-top pb-16 md:pb-20">
      <header className="shop-header">
        <div>
          <p className="shop-eyebrow">Shop</p>
          <h1 className="shop-heading">Collection</h1>
        </div>
      </header>

      <nav className="shop-filter-row" aria-label="Filter by category">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => startTransition(() => setActiveCategory(cat))}
            className={`pressable shop-filter ${
              activeCategory === cat
                ? 'is-active'
                : ''
            }`}
            aria-current={activeCategory === cat ? 'true' : undefined}
          >
            <span className="md:hidden">{MOBILE_CATEGORY_LABELS[cat] || cat}</span>
            <span className="hidden md:inline">{cat}</span>
          </button>
        ))}
      </nav>

      {error && (
        <p className="section-rule py-16 text-center text-base text-[var(--color-secondary)]">
          Products could not be loaded. Refresh to try again.
        </p>
      )}

      <div className="shop-masonry">
        {!error && filtered.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            variant="masonry"
          />
        ))}
      </div>

      {!error && filtered.length === 0 && (
        <p className="section-rule py-16 text-center text-base text-[var(--color-secondary)]">
          No products found in this category.
        </p>
      )}
    </div>
  )
}
