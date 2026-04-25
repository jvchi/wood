import { motion as framerMotion } from 'framer-motion'

const MotionDiv = framerMotion.div
const MotionImg = framerMotion.img

const productImageTransition = {
  duration: 0.68,
  ease: [0.22, 1, 0.36, 1],
}

export default function SharedProductImage({
  product,
  className = '',
  imageClassName = '',
  imageIndex = 0,
  borderRadius = 0,
  loading = 'lazy',
  onLoad,
}) {
  const image = product.images[imageIndex] || product.images[0]

  return (
    <MotionDiv
      layoutId={`product-card-${product.id}`}
      className={`shared-product-image ${className}`}
      style={{ borderRadius }}
      transition={productImageTransition}
    >
      <MotionImg
        layoutId={`product-image-${product.id}`}
        src={image}
        alt={product.name}
        width="800"
        height="1067"
        loading={loading}
        className={imageClassName}
        style={{ borderRadius }}
        transition={productImageTransition}
        onLoad={onLoad}
      />
    </MotionDiv>
  )
}
