import { supabase, hasSupabaseConfig } from './supabase'

export const PRODUCT_EVENT = 'wood:products-updated'

const PRODUCTS_KEY = 'wood.admin.products'
const CATEGORIES_KEY = 'wood.admin.categories'
const COLLECTIONS_KEY = 'wood.admin.collections'
export const PRODUCT_PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 800 1000%22%3E%3Crect width=%22800%22 height=%221000%22 fill=%22%23efeee8%22/%3E%3Cpath d=%22M210 570h380M250 500h300M310 430h180%22 stroke=%22%23000%22 stroke-opacity=%22.24%22 stroke-width=%2214%22 stroke-linecap=%22square%22/%3E%3Ctext x=%22400%22 y=%22635%22 text-anchor=%22middle%22 font-family=%22Arial,sans-serif%22 font-size=%2232%22 font-weight=%22700%22 fill=%22%23000%22 fill-opacity=%22.42%22%3EWOOD%3C/text%3E%3C/svg%3E'

export const defaultCategories = [
  { id: 'sofas', name: 'Sofas', slug: 'sofas', description: 'Soft seating for living spaces.' },
  { id: 'sectionals', name: 'Sectionals', slug: 'sectionals', description: 'Modular pieces for larger rooms.' },
  { id: 'chairs', name: 'Chairs', slug: 'chairs', description: 'Lounge, accent, and work chairs.' },
  { id: 'benches', name: 'Benches', slug: 'benches', description: 'Entry, dining, and bedroom benches.' },
  { id: 'ottomans', name: 'Ottomans', slug: 'ottomans', description: 'Footrests and soft tables.' },
  { id: 'daybeds', name: 'Daybeds', slug: 'daybeds', description: 'Hybrid lounging pieces.' },
]

export const defaultCollections = [
  { id: 'quiet-room', name: 'Quiet Room', slug: 'quiet-room', description: 'Low-profile pieces with calm silhouettes.' },
  { id: 'soft-forms', name: 'Soft Forms', slug: 'soft-forms', description: 'Rounded upholstery and tactile materials.' },
  { id: 'work-lounge', name: 'Work Lounge', slug: 'work-lounge', description: 'Pieces for studios, offices, and reading corners.' },
]

export const fallbackProducts = [
  {
    id: '1',
    name: 'Maren Sofa',
    slug: 'maren-sofa',
    category: 'sofas',
    category_id: 'sofas',
    collection: 'quiet-room',
    collection_id: 'quiet-room',
    price: 2490,
    regular_price: 2490,
    sale_price: '',
    compare_at_price: '',
    currency: 'USD',
    images: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=82',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1200&q=82',
      'https://images.unsplash.com/photo-1550254478-ead40cc54513?w=1200&q=82',
    ],
    description: 'A sculptural silhouette defined by gentle curves and deep cushioning. The Maren brings warmth to any space with its linen-blend upholstery and solid oak frame.',
    short_description: 'Curved linen sofa with a calm oak frame.',
    full_description: 'A sculptural silhouette defined by gentle curves and deep cushioning. The Maren brings warmth to any space with its linen-blend upholstery and solid oak frame.',
    dimensions: { width: 220, depth: 95, height: 78 },
    dimension_text: '220W x 95D x 78H cm',
    weight: '68 kg',
    materials: ['Linen blend', 'Solid oak', 'High-density foam'],
    material: 'Linen blend, solid oak, high-density foam',
    color: 'Sand',
    brand: 'Wood Studio',
    room_type: 'Living room',
    stock: 12,
    stock_quantity: 12,
    low_stock_threshold: 3,
    stock_status: 'in_stock',
    sku: 'WOOD-MAREN-SAND',
    tags: ['sofa', 'linen', 'oak'],
    variants: ['Sand', 'Charcoal', 'Oat'],
    published: true,
    featured: true,
    new_arrival: true,
    best_seller: false,
    show_on_homepage: true,
    show_in_collection: true,
    delivery_estimate: '2-4 weeks',
    assembly_required: false,
    care_instructions: 'Vacuum weekly. Spot clean with a damp cloth.',
    warranty_info: '3 year frame warranty.',
    return_eligible: true,
    seo_title: 'Maren Sofa | Wood',
    seo_description: 'A curved linen sofa with a solid oak frame and deep cushioning.',
    updated_at: '2026-04-20T10:00:00.000Z',
    created_at: '2026-04-20T10:00:00.000Z',
  },
  {
    id: '2',
    name: 'Elda Sectional',
    slug: 'elda-sectional',
    category: 'sectionals',
    category_id: 'sectionals',
    collection: 'soft-forms',
    collection_id: 'soft-forms',
    price: 4200,
    regular_price: 4200,
    currency: 'USD',
    images: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=82',
      'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=1200&q=82',
      'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1200&q=82',
    ],
    description: 'Modular by design, the Elda adapts to your space. Each section connects seamlessly, wrapped in boucle fabric with a refined low-profile stance.',
    short_description: 'Low modular sectional wrapped in bouclé.',
    full_description: 'Modular by design, the Elda adapts to your space. Each section connects seamlessly, wrapped in bouclé fabric with a refined low-profile stance.',
    dimensions: { width: 310, depth: 170, height: 72 },
    dimension_text: '310W x 170D x 72H cm',
    materials: ['Boucle fabric', 'Steel frame', 'Memory foam'],
    material: 'Boucle fabric, steel frame, memory foam',
    color: 'Ivory',
    brand: 'Wood Studio',
    room_type: 'Living room',
    stock: 5,
    stock_quantity: 5,
    low_stock_threshold: 3,
    stock_status: 'in_stock',
    sku: 'WOOD-ELDA-IVORY',
    tags: ['sectional', 'modular', 'boucle'],
    variants: ['Ivory', 'Slate', 'Moss'],
    published: true,
    featured: true,
    new_arrival: false,
    best_seller: true,
    show_on_homepage: true,
    show_in_collection: true,
    delivery_estimate: '3-5 weeks',
    assembly_required: true,
    care_instructions: 'Brush fabric lightly and spot clean.',
    warranty_info: '3 year frame warranty.',
    return_eligible: true,
    updated_at: '2026-04-18T10:00:00.000Z',
    created_at: '2026-04-18T10:00:00.000Z',
  },
  {
    id: '3',
    name: 'Kai Armchair',
    slug: 'kai-armchair',
    category: 'chairs',
    category_id: 'chairs',
    collection: 'work-lounge',
    collection_id: 'work-lounge',
    price: 1350,
    regular_price: 1350,
    currency: 'USD',
    images: [
      'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=1200&q=82',
      'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1200&q=82',
      'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=1200&q=82',
    ],
    description: 'Compact yet commanding, the Kai armchair features a cantilevered walnut base and enveloping upholstered shell.',
    short_description: 'Cantilevered walnut lounge chair.',
    full_description: 'Compact yet commanding, the Kai armchair features a cantilevered walnut base and enveloping upholstered shell.',
    dimensions: { width: 78, depth: 82, height: 76 },
    dimension_text: '78W x 82D x 76H cm',
    materials: ['Velvet', 'Walnut veneer', 'Plywood shell'],
    material: 'Velvet, walnut veneer, plywood shell',
    color: 'Terracotta',
    brand: 'Wood Studio',
    room_type: 'Office',
    stock: 2,
    stock_quantity: 2,
    low_stock_threshold: 3,
    stock_status: 'low_stock',
    sku: 'WOOD-KAI-TERRA',
    tags: ['chair', 'walnut', 'office'],
    variants: ['Terracotta', 'Navy', 'Cream'],
    published: true,
    featured: false,
    new_arrival: true,
    best_seller: false,
    show_on_homepage: false,
    show_in_collection: true,
    delivery_estimate: '1-3 weeks',
    assembly_required: false,
    care_instructions: 'Professional upholstery clean recommended.',
    warranty_info: '2 year warranty.',
    return_eligible: true,
    updated_at: '2026-04-16T10:00:00.000Z',
    created_at: '2026-04-16T10:00:00.000Z',
  },
  {
    id: '4',
    name: 'Lune Daybed',
    slug: 'lune-daybed',
    category: 'daybeds',
    category_id: 'daybeds',
    collection: 'quiet-room',
    collection_id: 'quiet-room',
    price: 3100,
    regular_price: 3100,
    currency: 'USD',
    images: [
      'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=1200&q=82',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=82',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1200&q=82',
    ],
    description: 'Inspired by Scandinavian minimalism, the Lune daybed blurs the line between furniture and architecture.',
    short_description: 'Architectural daybed for reading and rest.',
    full_description: 'Inspired by Scandinavian minimalism, the Lune daybed blurs the line between furniture and architecture.',
    dimensions: { width: 200, depth: 90, height: 65 },
    dimension_text: '200W x 90D x 65H cm',
    materials: ['Cotton canvas', 'Ash wood', 'Natural latex'],
    material: 'Cotton canvas, ash wood, natural latex',
    color: 'Natural',
    brand: 'Wood Studio',
    room_type: 'Bedroom',
    stock: 0,
    stock_quantity: 0,
    low_stock_threshold: 2,
    stock_status: 'out_of_stock',
    sku: 'WOOD-LUNE-NAT',
    tags: ['daybed', 'ash', 'canvas'],
    variants: ['Natural', 'Graphite', 'Sage'],
    published: true,
    featured: false,
    new_arrival: false,
    best_seller: false,
    show_on_homepage: false,
    show_in_collection: true,
    delivery_estimate: '4-6 weeks',
    assembly_required: true,
    care_instructions: 'Remove covers for dry cleaning only.',
    warranty_info: '3 year frame warranty.',
    return_eligible: true,
    updated_at: '2026-04-14T10:00:00.000Z',
    created_at: '2026-04-14T10:00:00.000Z',
  },
]

function readLocal(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function writeLocal(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent(PRODUCT_EVENT))
}

export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function inferStockStatus(quantity, threshold = 3, explicitStatus) {
  const stock = Number(quantity || 0)
  if (stock <= 0) return 'out_of_stock'
  if (explicitStatus === 'preorder') return 'preorder'
  if (stock <= Number(threshold || 0)) return 'low_stock'
  return 'in_stock'
}

export function normalizeProduct(product) {
  const quantity = Number(product.stock_quantity ?? product.stock ?? 0)
  const regularPrice = Number(product.regular_price ?? product.price ?? 0)
  const salePrice = product.sale_price === '' || product.sale_price == null ? '' : Number(product.sale_price)
  const images = Array.isArray(product.images) && product.images.length ? product.images : [PRODUCT_PLACEHOLDER_IMAGE]
  const tags = Array.isArray(product.tags)
    ? product.tags
    : String(product.tags || '').split(',').map(tag => tag.trim()).filter(Boolean)
  const materials = Array.isArray(product.materials)
    ? product.materials
    : String(product.material || '').split(',').map(item => item.trim()).filter(Boolean)
  const next = {
    ...product,
    id: String(product.id || crypto.randomUUID()),
    name: product.name || 'Untitled product',
    slug: product.slug || slugify(product.name || 'untitled-product'),
    category: product.category || product.category_id || 'uncategorized',
    category_id: product.category_id || product.category || 'uncategorized',
    collection: product.collection || product.collection_id || '',
    collection_id: product.collection_id || product.collection || '',
    regular_price: regularPrice,
    sale_price: salePrice,
    price: salePrice || regularPrice,
    currency: product.currency || 'USD',
    images,
    main_image_url: product.main_image_url || images[0] || '',
    description: product.description || product.short_description || '',
    short_description: product.short_description || product.description || '',
    full_description: product.full_description || product.description || '',
    stock_quantity: quantity,
    stock: quantity,
    low_stock_threshold: Number(product.low_stock_threshold ?? 3),
    stock_status: inferStockStatus(quantity, product.low_stock_threshold, product.stock_status),
    tags,
    materials,
    material: product.material || materials.join(', '),
    variants: Array.isArray(product.variants) ? product.variants : [],
    published: product.published !== false,
    archived: product.archived === true,
    featured: product.featured === true,
    new_arrival: product.new_arrival === true,
    best_seller: product.best_seller === true,
    show_on_homepage: product.show_on_homepage === true,
    show_in_collection: product.show_in_collection !== false,
    assembly_required: product.assembly_required === true,
    return_eligible: product.return_eligible !== false,
    discount_percentage: product.discount_percentage || calculateDiscount(regularPrice, salePrice),
    updated_at: product.updated_at || new Date().toISOString(),
    created_at: product.created_at || new Date().toISOString(),
  }
  if (!next.seo_title) next.seo_title = `${next.name} | Wood`
  if (!next.seo_description) next.seo_description = next.short_description || next.description
  return next
}

function calculateDiscount(regularPrice, salePrice) {
  if (!regularPrice || !salePrice) return 0
  return Math.max(0, Math.round(((regularPrice - salePrice) / regularPrice) * 100))
}

function mapSupabaseProduct(row) {
  const images = (row.product_images || [])
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map(image => image.url)
  const model = Array.isArray(row.product_models) ? row.product_models[0] : null

  return normalizeProduct({
    ...row,
    category: row.categories?.slug || row.category_id,
    collection: row.collections?.slug || row.collection_id,
    images: images.length ? images : [row.main_image_url].filter(Boolean),
    model_url: model?.url || row.model_url || '',
    model_lite_url: model?.lite_url || row.model_lite_url || '',
    model_poster_url: model?.poster_url || row.model_poster_url || '',
    model_version: model?.version || row.updated_at || '',
    model_scale: model?.scale || row.model_scale || 1,
    model_rotation: model?.rotation || row.model_rotation || '0,0,0',
    model_camera: model?.camera || row.model_camera || '',
    model_format: model?.format || '',
    model_file_size: model?.file_size || '',
  })
}

export async function listProducts({ includeUnpublished = false } = {}) {
  if (hasSupabaseConfig) {
    const query = supabase
      .from('products')
      .select('*, categories(slug,name), collections(slug,name), product_images(*), product_models(*)')
      .order('updated_at', { ascending: false })

    if (!includeUnpublished) query.eq('published', true).eq('archived', false)
    const { data, error } = await query
    if (!error && Array.isArray(data)) return data.map(mapSupabaseProduct)
  }

  const local = readLocal(PRODUCTS_KEY, fallbackProducts)
  return local.map(normalizeProduct).filter(product => includeUnpublished || (product.published && !product.archived))
}

export async function listCategories() {
  if (hasSupabaseConfig) {
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (!error && Array.isArray(data)) return data
  }
  return readLocal(CATEGORIES_KEY, defaultCategories)
}

export async function listCollections() {
  if (hasSupabaseConfig) {
    const { data, error } = await supabase.from('collections').select('*').order('name')
    if (!error && Array.isArray(data)) return data
  }
  return readLocal(COLLECTIONS_KEY, defaultCollections)
}

export async function saveProduct(product) {
  const normalized = normalizeProduct({ ...product, updated_at: new Date().toISOString() })
  if (hasSupabaseConfig) {
    const payload = toSupabaseProduct(normalized)
    const { error } = await supabase.from('products').upsert(payload)
    if (error) {
      if (error.code === '23505' && /products_sku_key/.test(error.message || '')) {
        throw new Error(
          payload.sku
            ? `SKU "${payload.sku}" is already used by another product.`
            : 'Existing rows have empty-string SKUs from a previous version. Run: update products set sku = null where sku = \'\'; in the Supabase SQL editor, then save again.',
        )
      }
      throw error
    }
    await replaceProductImages(normalized)
    await replaceProductModel(normalized)
    await logInventory(normalized, product.previous_stock_quantity)
    return normalized
  }

  const products = readLocal(PRODUCTS_KEY, fallbackProducts).map(normalizeProduct)
  const index = products.findIndex(item => item.id === normalized.id)
  const next = index >= 0
    ? products.map(item => (item.id === normalized.id ? normalized : item))
    : [normalized, ...products]
  writeLocal(PRODUCTS_KEY, next)
  return normalized
}

export async function deleteProduct(productId) {
  if (hasSupabaseConfig) {
    await purgeProductStorage(productId)
    const { error } = await supabase.from('products').delete().eq('id', productId)
    if (error) throw error
    window.dispatchEvent(new CustomEvent(PRODUCT_EVENT))
    return
  }
  writeLocal(PRODUCTS_KEY, readLocal(PRODUCTS_KEY, fallbackProducts).filter(product => product.id !== productId))
}

// Remove every storage object tied to a product before the row is deleted, so
// nothing lingers in the product-images/product-models buckets after delete.
async function purgeProductStorage(productId) {
  const pathsByBucket = new Map()
  const addPath = (bucket, path) => {
    if (!bucket || !path) return
    if (!pathsByBucket.has(bucket)) pathsByBucket.set(bucket, new Set())
    pathsByBucket.get(bucket).add(path)
  }

  const { data: uploads } = await supabase
    .from('product_uploads')
    .select('bucket_id,storage_path')
    .eq('product_id', productId)
  if (Array.isArray(uploads)) {
    for (const row of uploads) addPath(row.bucket_id, row.storage_path)
  }

  const { data: imageRows } = await supabase
    .from('product_images')
    .select('url')
    .eq('product_id', productId)
  if (Array.isArray(imageRows)) {
    for (const row of imageRows) addPath('product-images', storagePathFromPublicUrl(row.url, 'product-images'))
  }

  const { data: modelRows } = await supabase
    .from('product_models')
    .select('url,lite_url,poster_url')
    .eq('product_id', productId)
  if (Array.isArray(modelRows)) {
    for (const row of modelRows) {
      addPath('product-models', storagePathFromPublicUrl(row.url, 'product-models'))
      addPath('product-models', storagePathFromPublicUrl(row.lite_url, 'product-models'))
      addPath('product-images', storagePathFromPublicUrl(row.poster_url, 'product-images'))
    }
  }

  const { data: productRow } = await supabase
    .from('products')
    .select('main_image_url,fallback_image_url,og_image_url')
    .eq('id', productId)
    .maybeSingle()
  if (productRow) {
    addPath('product-images', storagePathFromPublicUrl(productRow.main_image_url, 'product-images'))
    addPath('product-images', storagePathFromPublicUrl(productRow.fallback_image_url, 'product-images'))
    addPath('product-images', storagePathFromPublicUrl(productRow.og_image_url, 'product-images'))
  }

  for (const [bucket, set] of pathsByBucket) {
    const paths = [...set]
    if (!paths.length) continue
    const { error } = await supabase.storage.from(bucket).remove(paths)
    if (error) console.warn(`Could not remove ${bucket} objects:`, error.message)
  }

  // product_uploads has on-delete-set-null on product_id, so we must explicitly
  // drop its rows here — otherwise the metadata stays after the product is gone.
  const { error: uploadErr } = await supabase
    .from('product_uploads')
    .delete()
    .eq('product_id', productId)
  if (uploadErr) console.warn('Could not remove product_uploads rows:', uploadErr.message)
}

export async function saveTaxonomy(type, values) {
  const key = type === 'category' ? CATEGORIES_KEY : COLLECTIONS_KEY
  const table = type === 'category' ? 'categories' : 'collections'
  const normalized = { ...values, id: values.id || slugify(values.name), slug: values.slug || slugify(values.name) }
  if (hasSupabaseConfig) {
    const { error } = await supabase.from(table).upsert(normalized)
    if (error) throw error
    return normalized
  }
  const existing = readLocal(key, type === 'category' ? defaultCategories : defaultCollections)
  const next = existing.some(item => item.id === normalized.id)
    ? existing.map(item => (item.id === normalized.id ? normalized : item))
    : [...existing, normalized]
  writeLocal(key, next)
  return normalized
}

export async function deleteTaxonomy(type, id) {
  const key = type === 'category' ? CATEGORIES_KEY : COLLECTIONS_KEY
  const table = type === 'category' ? 'categories' : 'collections'
  if (hasSupabaseConfig) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    return
  }
  const fallback = type === 'category' ? defaultCategories : defaultCollections
  writeLocal(key, readLocal(key, fallback).filter(item => item.id !== id))
}

function toSupabaseProduct(product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    short_description: product.short_description,
    full_description: product.full_description,
    description: product.description,
    category_id: product.category_id,
    collection_id: product.collection_id || null,
    tags: product.tags,
    material: product.material,
    color: product.color,
    dimensions: product.dimensions,
    dimension_text: product.dimension_text,
    weight: product.weight,
    brand: product.brand,
    room_type: product.room_type,
    regular_price: product.regular_price,
    sale_price: product.sale_price || null,
    currency: product.currency,
    discount_percentage: product.discount_percentage,
    cost_price: product.cost_price || null,
    compare_at_price: product.compare_at_price || null,
    stock_quantity: product.stock_quantity,
    sku: product.sku ? String(product.sku).trim() || null : null,
    low_stock_threshold: product.low_stock_threshold,
    stock_status: product.stock_status,
    main_image_url: product.images[0] || product.main_image_url || null,
    fallback_image_url: product.fallback_image_url || null,
    published: product.published,
    archived: product.archived,
    featured: product.featured,
    new_arrival: product.new_arrival,
    best_seller: product.best_seller,
    show_on_homepage: product.show_on_homepage,
    show_in_collection: product.show_in_collection,
    delivery_estimate: product.delivery_estimate,
    assembly_required: product.assembly_required,
    care_instructions: product.care_instructions,
    warranty_info: product.warranty_info,
    return_eligible: product.return_eligible,
    seo_title: product.seo_title,
    seo_description: product.seo_description,
    og_image_url: product.og_image_url,
    updated_at: product.updated_at,
    created_at: product.created_at,
  }
}

async function replaceProductImages(product) {
  await supabase.from('product_images').delete().eq('product_id', product.id)
  if (!product.images.length) return
  const rows = product.images.map((url, index) => ({
    product_id: product.id,
    url,
    sort_order: index,
    is_main: index === 0,
    alt_text: product.name,
  }))
  const { error } = await supabase.from('product_images').insert(rows)
  if (error) throw error
}

async function replaceProductModel(product) {
  await supabase.from('product_models').delete().eq('product_id', product.id)
  if (!product.model_url) return
  const { error } = await supabase.from('product_models').insert({
    product_id: product.id,
    url: product.model_url,
    lite_url: product.model_lite_url || null,
    poster_url: product.model_poster_url || product.fallback_image_url || product.images[0] || null,
    version: product.model_version || product.updated_at || null,
    fallback_image_url: product.fallback_image_url || product.images[0] || null,
    scale: Number(product.model_scale || 1),
    rotation: product.model_rotation || '0,0,0',
    camera: product.model_camera || null,
    format: product.model_format || 'glb',
    file_size: product.model_file_size ? Number(product.model_file_size) : null,
  })
  if (error) throw error
}

async function logInventory(product, previousQuantity) {
  if (previousQuantity == null || Number(previousQuantity) === Number(product.stock_quantity)) return
  await supabase.from('inventory_logs').insert({
    product_id: product.id,
    previous_quantity: Number(previousQuantity),
    new_quantity: Number(product.stock_quantity),
    reason: 'admin_update',
  })
}

export async function uploadAsset(file, bucket, productId, assetKind) {
  if (!file) return ''
  if (hasSupabaseConfig) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `${productId || 'draft'}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '31536000',
      upsert: true,
    })
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    await trackUpload({ file, bucket, productId, path, publicUrl: data.publicUrl, assetKind })
    return data.publicUrl
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function uploadModelSource(file, productId) {
  if (!hasSupabaseConfig) throw new Error('Supabase storage is required for auto-compression')
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `source/${productId || 'draft'}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from('product-models').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw error
  return path
}

function storagePathFromPublicUrl(url, bucket) {
  if (!url || typeof url !== 'string') return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length).split('?')[0]
}

export async function deleteProductModelAssets({ modelUrl, modelLiteUrl, modelPosterUrl, productId } = {}) {
  if (!hasSupabaseConfig) return
  const modelPaths = [
    storagePathFromPublicUrl(modelUrl, 'product-models'),
    storagePathFromPublicUrl(modelLiteUrl, 'product-models'),
  ].filter(Boolean)
  const posterPath = storagePathFromPublicUrl(modelPosterUrl, 'product-images')

  // Also remove the original source upload — its path lives at
  // product-models/source/<productId or 'draft'>/... — derive it from the
  // tracked product_uploads rows so we don't leave the raw upload behind.
  const trackedSourcePaths = []
  if (modelPaths.length) {
    const { data: tracked } = await supabase
      .from('product_uploads')
      .select('storage_path,asset_kind')
      .in('storage_path', modelPaths)
    if (Array.isArray(tracked)) {
      for (const row of tracked) {
        if (row.asset_kind !== 'source_model') continue
        trackedSourcePaths.push(row.storage_path)
      }
    }
    // also pull source rows tied to the same compressed dir(s)
    const compressedDirs = new Set(modelPaths.map(p => p.split('/').slice(0, -1).join('/')))
    if (compressedDirs.size && productId) {
      const { data: relatedSources } = await supabase
        .from('product_uploads')
        .select('storage_path')
        .eq('product_id', productId)
        .eq('asset_kind', 'source_model')
      if (Array.isArray(relatedSources)) {
        for (const row of relatedSources) trackedSourcePaths.push(row.storage_path)
      }
    }
  }

  const allModelPaths = [...new Set([...modelPaths, ...trackedSourcePaths])]
  if (allModelPaths.length) {
    const { error } = await supabase.storage.from('product-models').remove(allModelPaths)
    if (error) console.warn('Could not remove model storage objects:', error.message)
  }
  if (posterPath) {
    const { error } = await supabase.storage.from('product-images').remove([posterPath])
    if (error) console.warn('Could not remove poster:', error.message)
  }

  // Drop tracked upload rows for everything we just removed.
  if (allModelPaths.length || posterPath) {
    const allPaths = [...allModelPaths, ...(posterPath ? [posterPath] : [])]
    const { error: trackErr } = await supabase
      .from('product_uploads')
      .delete()
      .in('storage_path', allPaths)
    if (trackErr) console.warn('Could not remove product_uploads rows:', trackErr.message)
  }

  // If the product is already persisted, drop its product_models row so the
  // public site stops resolving the model.
  if (productId) {
    const { error: modelErr } = await supabase
      .from('product_models')
      .delete()
      .eq('product_id', productId)
    if (modelErr) console.warn('Could not remove product_models row:', modelErr.message)
  }
}

export async function compressUploadedModel({ sourcePath, productId, sourceFileName, sourceContentType, force }) {
  if (!hasSupabaseConfig) throw new Error('Supabase is required for auto-compression')
  const { data, error } = await supabase.functions.invoke('compress-model', {
    body: {
      sourcePath,
      productId: productId || null,
      sourceFileName: sourceFileName || null,
      sourceContentType: sourceContentType || null,
      force: force || false,
    },
  })
  if (error) {
    // supabase-js wraps non-2xx responses in a FunctionsHttpError that hides
    // the JSON body — pull it out so the admin sees the real cause.
    let detail = ''
    try {
      const body = await error.context?.json?.()
      if (body?.error) detail = `: ${body.error}`
    } catch {
      try {
        const text = await error.context?.text?.()
        if (text) detail = `: ${text}`
      } catch {
        // give up, surface bare message
      }
    }
    throw new Error(`${error.message}${detail}`)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

async function trackUpload({ file, bucket, productId, path, publicUrl, assetKind }) {
  const kind = assetKind || (bucket === 'product-models' ? 'model' : 'image')
  const { error } = await supabase.from('product_uploads').insert({
    product_id: productId || null,
    bucket_id: bucket,
    storage_path: path,
    public_url: publicUrl,
    asset_kind: kind,
    file_name: file.name,
    content_type: file.type || null,
    file_size: file.size || null,
    status: 'ready',
  })

  if (error && !String(error.message || '').includes('product_uploads')) {
    console.warn('Upload tracked in storage but metadata tracking failed.', error)
  }
}
