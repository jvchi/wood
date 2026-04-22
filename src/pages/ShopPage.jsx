import { useState, useMemo } from 'react'
import { useProducts } from '../hooks/useProducts'
import ProductCard from '../components/ui/ProductCard'
import Skeleton from '../components/ui/Skeleton'

const ALL_CATEGORY = 'all'
const MOBILE_CATEGORY_LABELS = {
  all: 'all',
  sectionals: 'sect.',
  ottomans: 'otto.',
  benches: 'bench',
}

export default function ShopPage() {
  const { products, loading } = useProducts()
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY)

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))]
    return [ALL_CATEGORY, ...cats]
  }, [products])

  const filtered = useMemo(() => {
    if (activeCategory === ALL_CATEGORY) return products
    return products.filter(p => p.category === activeCategory)
  }, [products, activeCategory])

  return (
    <div className="page-shell page-top pb-16 md:pb-20">
      <header className="mb-8 grid min-w-0 gap-6 md:mb-10 md:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)]">
        <div>
          <p className="label-text mb-3 text-[var(--color-muted)]">Shop</p>
          <h1 className="display-heading">Collection</h1>
        </div>
        <p className="body-copy hidden md:block md:pt-7">
          Permanent furniture in a direct catalog layout. Filter by category, compare proportions, and go straight to the piece.
        </p>
      </header>

      {!loading && (
        <nav className="filter-row mb-8 md:mb-10" aria-label="Filter by category">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`pressable label-text-compact min-h-11 ${
                activeCategory === cat
                  ? 'text-[var(--color-primary)] underline underline-offset-4'
                  : 'text-[var(--color-secondary)]'
              }`}
              aria-current={activeCategory === cat ? 'true' : undefined}
            >
              <span className="md:hidden">{MOBILE_CATEGORY_LABELS[cat] || cat}</span>
              <span className="hidden md:inline">{cat}</span>
            </button>
          ))}
        </nav>
      )}

      {loading ? (
        <div className="product-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-square" />
              <Skeleton className="mt-3 h-4 w-24" />
              <Skeleton className="mt-2 h-4 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="product-grid">
          {filtered.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="section-rule py-16 text-center text-base text-[var(--color-secondary)]">
          No products found in this category.
        </p>
      )}
    </div>
  )
}
