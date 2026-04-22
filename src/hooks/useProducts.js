import { useState, useEffect } from 'react'

const API_URL = 'https://couchweb.api/products'

const MOCK_PRODUCTS = [
  {
    id: '1',
    name: 'Maren Sofa',
    category: 'sofas',
    price: 2490,
    currency: 'USD',
    images: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80',
      'https://images.unsplash.com/photo-1550254478-ead40cc54513?w=800&q=80',
    ],
    description: 'A sculptural silhouette defined by gentle curves and deep cushioning. The Maren brings warmth to any space with its linen-blend upholstery and solid oak frame.',
    dimensions: { width: 220, depth: 95, height: 78 },
    materials: ['Linen blend', 'Solid oak', 'High-density foam'],
    stock: 12,
    variants: ['Sand', 'Charcoal', 'Oat'],
  },
  {
    id: '2',
    name: 'Elda Sectional',
    category: 'sectionals',
    price: 4200,
    currency: 'USD',
    images: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
      'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=800&q=80',
      'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80',
    ],
    description: 'Modular by design, the Elda adapts to your space. Each section connects seamlessly, wrapped in bouclé fabric with a refined low-profile stance.',
    dimensions: { width: 310, depth: 170, height: 72 },
    materials: ['Bouclé fabric', 'Steel frame', 'Memory foam'],
    stock: 5,
    variants: ['Ivory', 'Slate', 'Moss'],
  },
  {
    id: '3',
    name: 'Kai Armchair',
    category: 'chairs',
    price: 1350,
    currency: 'USD',
    images: [
      'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&q=80',
      'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80',
      'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800&q=80',
    ],
    description: 'Compact yet commanding, the Kai armchair features a cantilevered walnut base and enveloping upholstered shell. A statement of restraint.',
    dimensions: { width: 78, depth: 82, height: 76 },
    materials: ['Velvet', 'Walnut veneer', 'Plywood shell'],
    stock: 18,
    variants: ['Terracotta', 'Navy', 'Cream'],
  },
  {
    id: '4',
    name: 'Lune Daybed',
    category: 'daybeds',
    price: 3100,
    currency: 'USD',
    images: [
      'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80',
    ],
    description: 'Inspired by Scandinavian minimalism, the Lune daybed blurs the line between furniture and architecture. Rest, read, recline.',
    dimensions: { width: 200, depth: 90, height: 65 },
    materials: ['Cotton canvas', 'Ash wood', 'Natural latex'],
    stock: 7,
    variants: ['Natural', 'Graphite', 'Sage'],
  },
  {
    id: '5',
    name: 'Sten Ottoman',
    category: 'ottomans',
    price: 780,
    currency: 'USD',
    images: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
      'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=800&q=80',
    ],
    description: 'A versatile companion to any sofa. The Sten ottoman doubles as additional seating, a footrest, or a tray table with its reversible cushion top.',
    dimensions: { width: 65, depth: 65, height: 42 },
    materials: ['Boucle fabric', 'Birch wood', 'Pocket springs'],
    stock: 24,
    variants: ['Sand', 'Storm', 'Blush'],
  },
  {
    id: '6',
    name: 'Voss Loveseat',
    category: 'sofas',
    price: 1890,
    currency: 'USD',
    images: [
      'https://images.unsplash.com/photo-1550254478-ead40cc54513?w=800&q=80',
      'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80',
      'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80',
    ],
    description: 'Intimate scale, generous comfort. The Voss loveseat is tailored for compact living without compromising on the depth of sit that makes a sofa worth having.',
    dimensions: { width: 160, depth: 90, height: 75 },
    materials: ['Linen', 'Solid beech', 'Down-feather fill'],
    stock: 9,
    variants: ['Pebble', 'Indigo', 'Bone'],
  },
  {
    id: '7',
    name: 'Nora Bench',
    category: 'benches',
    price: 950,
    currency: 'USD',
    images: [
      'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&q=80',
      'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
    ],
    description: 'The Nora bench brings structure to entryways and bedrooms. Its clean lines and leather-wrapped frame create a quiet presence in any room.',
    dimensions: { width: 130, depth: 45, height: 48 },
    materials: ['Full-grain leather', 'Powder-coated steel', 'Dense foam'],
    stock: 15,
    variants: ['Cognac', 'Black', 'Tan'],
  },
  {
    id: '8',
    name: 'Aiko Chaise',
    category: 'chairs',
    price: 2750,
    currency: 'USD',
    images: [
      'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800&q=80',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80',
    ],
    description: 'Elongated elegance. The Aiko chaise is a sculptural lounge piece that invites long afternoons. Upholstered in cashmere-wool blend with brass-tipped legs.',
    dimensions: { width: 170, depth: 75, height: 80 },
    materials: ['Cashmere-wool blend', 'Solid walnut', 'Brass'],
    stock: 4,
    variants: ['Fog', 'Ember', 'Onyx'],
  },
]

export function useProducts() {
  const [products, setProducts] = useState(MOCK_PRODUCTS)
  const loading = false
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    async function fetchProducts() {
      setError(null)
      try {
        const res = await fetch(API_URL, { signal: controller.signal })
        if (!res.ok) throw new Error(`Failed to fetch products`)
        const data = await res.json()
        if (!cancelled && Array.isArray(data) && data.length > 0) setProducts(data)
      } catch (err) {
        if (!cancelled) {
          setError(err)
        }
      }
    }
    fetchProducts()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  return { products, loading, error }
}
