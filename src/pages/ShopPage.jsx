import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProducts } from '../hooks/useProducts'
import ProductCard from '../components/ui/ProductCard'
import Skeleton from '../components/ui/Skeleton'

const MotionProductCard = motion(ProductCard)

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
              onClick={() => setActiveCategory(cat)}
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
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[4/5]" />
              <Skeleton className="mt-2 h-3 w-24" />
              <Skeleton className="mt-2 h-4 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div layout className="shop-masonry">
          <AnimatePresence>
            {filtered.map((product, index) => (
              <MotionProductCard 
                key={product.id} 
                product={product} 
                index={index} 
                variant="masonry" 
                layout="position"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.25 } }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="section-rule py-16 text-center text-base text-[var(--color-secondary)]">
          No products found in this category.
        </p>
      )}
    </div>
  )
}
