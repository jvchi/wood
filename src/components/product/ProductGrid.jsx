import { AnimatePresence, motion } from 'framer-motion'
import ProductCard from '../ui/ProductCard'

const productGridTransition = {
  layout: {
    duration: 0.55,
    ease: [0.22, 1, 0.36, 1],
  },
}

export default function ProductGrid({ products, selectedProductId, onSelectProduct }) {
  return (
    <motion.div layout className="shop-masonry" transition={productGridTransition}>
      <AnimatePresence initial={false}>
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            variant="masonry"
            selected={selectedProductId === product.id}
            onSelect={onSelectProduct}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
