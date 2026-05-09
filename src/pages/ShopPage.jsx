import { useState, useMemo, startTransition } from 'react'
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
    <div className="shop-page page-shell page-top pb-16 md:pb-20">
      <header className="shop-header">
        <div>
          <p className="shop-eyebrow">Shop</p>
          <h1 className="shop-heading">Collection</h1>
        </div>
      </header>

      {!loading && (
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
      )}

      {loading ? (
        <div className="shop-masonry">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mb-[clamp(1.35rem,3vw,2.4rem)]">
              <Skeleton className="aspect-[10/9]" />
              <Skeleton className="mt-2 h-2.5 w-20" />
              <Skeleton className="mt-1.5 h-2.5 w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="shop-masonry">
          {filtered.map((product, index) => (
            <ProductCard
              key={product.id} 
              product={product} 
              index={index} 
              variant="masonry" 
            />
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
