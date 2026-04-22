import { useMemo, useState } from 'react'
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

function HomeSkeleton() {
  return (
    <div className="product-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-square" />
          <Skeleton className="mt-3 h-4 w-28" />
          <Skeleton className="mt-2 h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  const { products, loading } = useProducts()
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY)

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map(product => product.category))]
    return [ALL_CATEGORY, ...uniqueCategories]
  }, [products])

  const featured = useMemo(() => {
    if (activeCategory === ALL_CATEGORY) return products
    return products.filter(product => product.category === activeCategory)
  }, [activeCategory, products])

  return (
    <div className="page-shell page-top pb-16 md:pb-20">
      <header className="mb-8 grid min-w-0 gap-8 md:mb-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <p className="label-text mb-3 text-[var(--color-muted)]">New</p>
          <h1 className="display-heading" translate="no">Wood</h1>
        </div>
        <nav className="filter-row md:justify-end" aria-label="Filter by category">
          {!loading && categories.map(category => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`pressable label-text-compact min-h-11 ${activeCategory === category ? 'text-[var(--color-primary)] underline underline-offset-4' : 'text-[var(--color-secondary)]'}`}
              aria-current={activeCategory === category ? 'true' : undefined}
            >
              <span className="md:hidden">{MOBILE_CATEGORY_LABELS[category] || category}</span>
              <span className="hidden md:inline">{category}</span>
            </button>
          ))}
        </nav>
      </header>

      {loading ? <HomeSkeleton /> : (
        <section aria-label="Featured products">
          <div className="product-grid">
            {featured.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {!loading && featured.length === 0 && (
        <section className="section-rule mt-12 py-16 text-center">
          <h2 className="label-text">No Products Found</h2>
        </section>
      )}
    </div>
  )
}
