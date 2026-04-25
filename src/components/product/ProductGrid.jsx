import { AnimatePresence, motion as framerMotion } from 'framer-motion'
import ProductCard from '../ui/ProductCard'

const MotionDiv = framerMotion.div

const productGridTransition = {
  layout: {
    duration: 0.55,
    ease: [0.22, 1, 0.36, 1],
  },
}

export default function ProductGrid({ products, selectedProductId, onSelectProduct }) {
  return (
    <MotionDiv layout className="shop-masonry" transition={productGridTransition}>
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
    </MotionDiv>
  )
}
