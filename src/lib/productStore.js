import { supabase, hasSupabaseConfig, supabaseUrlPublic, supabaseAnonKeyPublic } from './supabase'
import { Upload } from 'tus-js-client'

export const PRODUCT_EVENT = 'wood:products-updated'

const CATEGORIES_KEY = 'wood.admin.categories'
const COLLECTIONS_KEY = 'wood.admin.collections'
const PRODUCT_CACHE_PUBLIC = 'published'
const PRODUCT_CACHE_ALL = 'include-unpublished'
const PRODUCT_QUERY_TIMEOUT_MS = 10000
const productListCache = new Map()
const productListRequests = new Map()
const productDetailCache = new Map()
const productDetailRequests = new Map()
let productListCacheVersion = 0
export const PRODUCT_PLACEHOLDER_IMAGE = ''

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

// Generates a tiny WebP preview of the source image with the SOURCE aspect
// ratio preserved (longest side capped at `maxSide`). Also reports the source
// dimensions so callers can persist them — needed to reserve the right card
// height before the full image loads.
async function createImageThumbnailFile(file, { maxSide = 240, quality = 0.6 } = {}) {
  if (!file || typeof document === 'undefined') return null

  let bitmap = null
  let objectUrl = ''
  try {
    if ('createImageBitmap' in window) {
      bitmap = await createImageBitmap(file)
    } else {
      objectUrl = URL.createObjectURL(file)
      bitmap = await new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = reject
        image.src = objectUrl
      })
    }

    const sourceWidth = bitmap.width
    const sourceHeight = bitmap.height
    if (!sourceWidth || !sourceHeight) return null

    const scale = Math.min(maxSide / Math.max(sourceWidth, sourceHeight), 1)
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale))
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(bitmap, 0, 0, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight)

    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/webp', quality)
    })
    if (!blob) return null

    const baseName = String(file.name || 'image').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '-')
    const thumbnailFile = new File([blob], `${baseName}-thumb.webp`, { type: 'image/webp' })
    return { file: thumbnailFile, width: sourceWidth, height: sourceHeight }
  } catch {
    return null
  } finally {
    if (bitmap?.close) bitmap.close()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}

function productListCacheKey(includeUnpublished) {
  return includeUnpublished ? PRODUCT_CACHE_ALL : PRODUCT_CACHE_PUBLIC
}

function filterPublicProducts(products) {
  return products.filter(product => product.published && !product.archived)
}

function setCachedProducts(includeUnpublished, products) {
  const cachedAt = Date.now()
  productListCache.set(productListCacheKey(includeUnpublished), { products, cachedAt })
  for (const product of products) {
    productDetailCache.set(product.id, product)
  }

  if (includeUnpublished) {
    productListCache.set(PRODUCT_CACHE_PUBLIC, {
      products: filterPublicProducts(products),
      cachedAt,
    })
  }
}

export function getCachedProducts({ includeUnpublished = false } = {}) {
  const cached = productListCache.get(productListCacheKey(includeUnpublished))
  if (cached) return cached.products

  if (!includeUnpublished) {
    const allProducts = productListCache.get(PRODUCT_CACHE_ALL)
    if (allProducts) return filterPublicProducts(allProducts.products)
  }

  return null
}

export function clearProductListCache() {
  productListCacheVersion += 1
  productListCache.clear()
  productListRequests.clear()
  productDetailCache.clear()
  productDetailRequests.clear()
}

async function runSupabaseProductQuery(query) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller
    ? setTimeout(() => controller.abort(), PRODUCT_QUERY_TIMEOUT_MS)
    : null

  try {
    const request = controller && typeof query.abortSignal === 'function'
      ? query.abortSignal(controller.signal)
      : query
    return await Promise.race([
      request,
      new Promise(resolve => {
        setTimeout(() => resolve({ data: null, error: new Error('Product query timed out') }), PRODUCT_QUERY_TIMEOUT_MS)
      }),
    ])
  } catch (error) {
    return { data: null, error }
  } finally {
    if (timer) clearTimeout(timer)
  }
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
  const imageThumbnails = Array.isArray(product.image_thumbnails)
    ? product.image_thumbnails
    : Array.isArray(product.thumbnail_images)
      ? product.thumbnail_images
      : []
  const imageDisplays = Array.isArray(product.image_displays) ? product.image_displays : []
  const images = Array.isArray(product.images) && product.images.length
    ? product.images
    : imageThumbnails.filter(Boolean)
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
    image_thumbnails: images.map((_, index) => imageThumbnails[index] || ''),
    image_displays: images.map((_, index) => imageDisplays[index] || ''),
    image_dimensions: images.map((_, index) => {
      const dim = product.image_dimensions?.[index]
      return dim && dim.width && dim.height
        ? { width: dim.width, height: dim.height }
        : null
    }),
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
  const imageRows = (row.product_images || [])
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const images = imageRows.map(image => image.url)
  const imageThumbnails = imageRows.map(image => image.thumbnail_url || '')
  const imageDisplays = imageRows.map(image => image.display_url || '')
  const imageDimensions = imageRows.map(image =>
    image.width && image.height ? { width: image.width, height: image.height } : null,
  )
  const model = Array.isArray(row.product_models) ? row.product_models[0] : null

  return normalizeProduct({
    ...row,
    category: row.categories?.slug || row.category_id,
    collection: row.collections?.slug || row.collection_id,
    images: images.length ? images : [row.main_image_url].filter(Boolean),
    image_thumbnails: imageThumbnails,
    image_displays: imageDisplays,
    image_dimensions: imageDimensions,
    model_url: model?.url || row.model_url || '',
    model_lite_url: model?.lite_url || row.model_lite_url || '',
    model_poster_url: model?.poster_url || row.model_poster_url || '',
    model_version: model?.version || row.updated_at || '',
    model_scale: model?.scale || row.model_scale || 1,
    model_rotation: model?.rotation || row.model_rotation || '0,0,0',
    model_camera: model?.camera || row.model_camera || '',
    model_light_position: model?.metadata?.light_position || row.model_light_position || '',
    model_format: model?.format || '',
    model_file_size: model?.file_size || '',
  })
}

function requireSupabaseConfig() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error('Supabase configuration is required to load products.')
  }
}

// Once the dimensions migration is applied this flag stays false and the
// `width,height` columns are part of the query. Before the migration is
// applied (or if the column ever disappears), the first failed query flips
// the flag and we re-issue the query without those columns. Cached in
// sessionStorage so we don't pay the failed round-trip every page load.
const MISSING_DIMENSIONS_KEY = 'productImageDimensionsMissing'
let imageDimensionsMissing =
  typeof sessionStorage !== 'undefined' && sessionStorage.getItem(MISSING_DIMENSIONS_KEY) === '1'

// Set when the `display_url` column isn't present yet (before the
// add_product_image_displays migration is applied). Keeps the query from
// 400ing; the app falls back to render-transform/raw URLs until it's there.
const MISSING_DISPLAY_KEY = 'productImageDisplayMissing'
let imageDisplayMissing =
  typeof sessionStorage !== 'undefined' && sessionStorage.getItem(MISSING_DISPLAY_KEY) === '1'

function markImageDimensionsMissing() {
  if (imageDimensionsMissing) return
  imageDimensionsMissing = true
  try {
    sessionStorage.setItem(MISSING_DIMENSIONS_KEY, '1')
  } catch {
    // ignore — flag still set in-memory for the rest of the session
  }
}

function markImageDisplayMissing() {
  if (imageDisplayMissing) return
  imageDisplayMissing = true
  try {
    sessionStorage.setItem(MISSING_DISPLAY_KEY, '1')
  } catch {
    // ignore — flag still set in-memory for the rest of the session
  }
}

function buildProductSelect() {
  const imageCols = ['url', 'thumbnail_url']
  if (!imageDisplayMissing) imageCols.push('display_url')
  if (!imageDimensionsMissing) imageCols.push('width', 'height')
  imageCols.push('sort_order', 'is_main')
  return PRODUCT_SELECT_TEMPLATE.replace('__IMAGE_COLS__', imageCols.join(','))
}

// Flips whichever optional image column is missing and returns true when it
// changed something, so the caller can re-issue the query. Supabase / PostgREST
// returns code "42703" (undefined column); the message usually names it.
function handleMissingColumn(error) {
  if (!error) return false
  const message = String(error.message || '').toLowerCase()
  const undefinedColumn = error.code === '42703' || message.includes('column')
  if (!undefinedColumn) return false

  if (!imageDisplayMissing && message.includes('display_url')) {
    markImageDisplayMissing()
    return true
  }
  if (!imageDimensionsMissing && (message.includes('width') || message.includes('height'))) {
    markImageDimensionsMissing()
    return true
  }
  // 42703 without a recognizable column name: drop optional columns newest-first.
  if (error.code === '42703') {
    if (!imageDisplayMissing) {
      markImageDisplayMissing()
      return true
    }
    if (!imageDimensionsMissing) {
      markImageDimensionsMissing()
      return true
    }
  }
  return false
}

const PRODUCT_SELECT_TEMPLATE = `
  id,
  name,
  slug,
  short_description,
  full_description,
  description,
  category_id,
  collection_id,
  tags,
  material,
  color,
  dimensions,
  dimension_text,
  weight,
  brand,
  room_type,
  regular_price,
  sale_price,
  currency,
  discount_percentage,
  cost_price,
  compare_at_price,
  stock_quantity,
  sku,
  low_stock_threshold,
  stock_status,
  main_image_url,
  fallback_image_url,
  published,
  archived,
  featured,
  new_arrival,
  best_seller,
  show_on_homepage,
  show_in_collection,
  delivery_estimate,
  assembly_required,
  care_instructions,
  warranty_info,
  return_eligible,
  seo_title,
  seo_description,
  og_image_url,
  created_at,
  updated_at,
  categories(slug,name),
  collections(slug,name),
  product_images(__IMAGE_COLS__),
  product_models(url,lite_url,poster_url,version,fallback_image_url,scale,rotation,format,file_size,camera,metadata)
`

async function fetchProductsFromSource({ includeUnpublished }) {
  requireSupabaseConfig()

  const runOnce = () => {
    const query = supabase
      .from('products')
      .select(buildProductSelect())
      .order('updated_at', { ascending: false })
    if (!includeUnpublished) query.eq('published', true).eq('archived', false)
    return runSupabaseProductQuery(query)
  }

  let { data, error } = await runOnce()
  while (error && handleMissingColumn(error)) {
    ;({ data, error } = await runOnce())
  }
  if (error) throw error
  if (!Array.isArray(data)) throw new Error('Supabase returned an invalid products response.')
  return data.map(mapSupabaseProduct)
}

async function fetchProductFromSource(productId) {
  requireSupabaseConfig()

  const runOnce = () =>
    runSupabaseProductQuery(
      supabase
        .from('products')
        .select(buildProductSelect())
        .eq('id', productId)
        .eq('published', true)
        .eq('archived', false)
        .maybeSingle(),
    )

  let { data, error } = await runOnce()
  while (error && handleMissingColumn(error)) {
    ;({ data, error } = await runOnce())
  }
  if (error) throw error
  return data ? mapSupabaseProduct(data) : null
}

export async function listProducts({ includeUnpublished = false, force = false } = {}) {
  if (force) clearProductListCache()

  const cached = !force ? getCachedProducts({ includeUnpublished }) : null
  if (cached) return cached

  const key = productListCacheKey(includeUnpublished)
  const pending = productListRequests.get(key)
  if (pending) return pending

  if (!includeUnpublished) {
    const pendingAllProducts = productListRequests.get(PRODUCT_CACHE_ALL)
    if (pendingAllProducts) {
      return pendingAllProducts.then(filterPublicProducts)
    }
  }

  const requestVersion = productListCacheVersion
  const request = fetchProductsFromSource({ includeUnpublished })
    .then(products => {
      if (requestVersion === productListCacheVersion) {
        setCachedProducts(includeUnpublished, products)
      }
      return products
    })
    .finally(() => {
      productListRequests.delete(key)
    })

  productListRequests.set(key, request)
  return request
}

export async function getProduct(productId, { force = false } = {}) {
  const id = String(productId || '')
  if (!id) return null
  if (force) {
    productDetailCache.delete(id)
    productDetailRequests.delete(id)
  }

  const cached = !force ? productDetailCache.get(id) : null
  if (cached) return cached

  const pending = productDetailRequests.get(id)
  if (pending) return pending

  const request = fetchProductFromSource(id)
    .then(product => {
      if (product) productDetailCache.set(id, product)
      return product
    })
    .finally(() => {
      productDetailRequests.delete(id)
    })

  productDetailRequests.set(id, request)
  return request
}

export async function listCategories() {
  if (hasSupabaseConfig) {
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (!error && Array.isArray(data)) {
      if (data.length) return data
      return seedDefaultTaxonomy('category')
    }
  }
  return readLocal(CATEGORIES_KEY, defaultCategories)
}

export async function listCollections() {
  if (hasSupabaseConfig) {
    const { data, error } = await supabase.from('collections').select('*').order('name')
    if (!error && Array.isArray(data)) {
      if (data.length) return data
      return seedDefaultTaxonomy('collection')
    }
  }
  return readLocal(COLLECTIONS_KEY, defaultCollections)
}

export async function saveProduct(product) {
  const normalized = normalizeProduct({ ...product, updated_at: new Date().toISOString() })
  requireSupabaseConfig()
  await ensureTaxonomyReference('category', normalized.category_id)
  if (normalized.collection_id) await ensureTaxonomyReference('collection', normalized.collection_id)
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
  clearProductListCache()
  window.dispatchEvent(new CustomEvent(PRODUCT_EVENT))
  return normalized
}

export async function deleteProduct(productId) {
  requireSupabaseConfig()
  await purgeProductStorage(productId)
  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) throw error
  clearProductListCache()
  window.dispatchEvent(new CustomEvent(PRODUCT_EVENT))
}

function taxonomyConfig(type) {
  return type === 'category'
    ? { table: 'categories', defaults: defaultCategories }
    : { table: 'collections', defaults: defaultCollections }
}

function sortByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

function labelFromSlug(value) {
  const words = String(value || '').split(/[-_\s]+/).filter(Boolean)
  if (!words.length) return 'Uncategorized'
  return words.map(word => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(' ')
}

async function seedDefaultTaxonomy(type) {
  const { table, defaults } = taxonomyConfig(type)
  const { data, error } = await supabase
    .from(table)
    .upsert(defaults, { onConflict: 'id' })
    .select('*')

  if (error || !Array.isArray(data)) return defaults
  return sortByName(data)
}

async function ensureTaxonomyReference(type, value) {
  if (!value) return
  const { table, defaults } = taxonomyConfig(type)
  const fallback = defaults.find(item => item.id === value || item.slug === value)
  const id = fallback?.id || value
  const row = fallback || {
    id,
    slug: slugify(value),
    name: labelFromSlug(value),
    description: '',
  }

  const { error } = await supabase.from(table).upsert(row, { onConflict: 'id' })
  if (error) throw error
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
    for (const row of imageRows) {
      addPath('product-images', storagePathFromPublicUrl(row.url, 'product-images'))
      addPath('product-images', storagePathFromPublicUrl(row.thumbnail_url, 'product-images'))
    }
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
  const rows = product.images.map((url, index) => {
    const dim = product.image_dimensions?.[index]
    const base = {
      product_id: product.id,
      url,
      thumbnail_url: product.image_thumbnails?.[index] || null,
      sort_order: index,
      is_main: index === 0,
      alt_text: product.name,
    }
    // Only include width/height when the columns exist on the table — before
    // the dimensions migration is applied, sending them would 400.
    if (!imageDimensionsMissing && dim?.width && dim?.height) {
      base.width = dim.width
      base.height = dim.height
    }
    // Likewise only send display_url once the column exists.
    if (!imageDisplayMissing && product.image_displays?.[index]) {
      base.display_url = product.image_displays[index]
    }
    return base
  })
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
    metadata: {
      light_position: product.model_light_position || null,
    },
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
  requireSupabaseConfig()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `${productId || 'draft'}/${Date.now()}-${safeName}`
  if (bucket === 'product-models') {
    await uploadStorageResumable(file, bucket, path, {
      contentType: modelContentType(file),
      cacheControl: '31536000',
      upsert: true,
    })
  } else {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '31536000',
      upsert: true,
    })
    if (error) throw error
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  await trackUpload({ file, bucket, productId, path, publicUrl: data.publicUrl, assetKind })
  return data.publicUrl
}

function projectStorageUrl() {
  if (!supabaseUrlPublic) return ''
  return supabaseUrlPublic.replace('https://', 'https://').replace('.supabase.co', '.storage.supabase.co')
}

function modelContentType(file) {
  const name = file?.name?.toLowerCase?.() || ''
  if (name.endsWith('.gltf')) return 'model/gltf+json'
  return 'model/gltf-binary'
}

async function getStorageAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || supabaseAnonKeyPublic
}

export async function uploadStorageResumable(file, bucket, path, {
  contentType = file?.type || 'application/octet-stream',
  cacheControl = '3600',
  upsert = true,
  onProgress,
} = {}) {
  if (!hasSupabaseConfig) throw new Error('Supabase storage is required for resumable uploads')
  const token = await getStorageAccessToken()
  const endpoint = `${projectStorageUrl()}/storage/v1/upload/resumable`

  await new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: {
        authorization: `Bearer ${token}`,
        'x-upsert': upsert ? 'true' : 'false',
      },
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType,
        cacheControl,
      },
      onError: reject,
      onProgress: (bytesUploaded, bytesTotal) => {
        onProgress?.({ bytesUploaded, bytesTotal, percent: bytesTotal ? (bytesUploaded / bytesTotal) * 100 : 0 })
      },
      onSuccess: resolve,
    })

    upload.findPreviousUploads()
      .then(previousUploads => {
        if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0])
        upload.start()
      })
      .catch(reject)
  })
}

async function uploadImageVariant(variant, { productId, folder, assetKind }) {
  if (!variant?.file) return ''
  const safeName = variant.file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `${folder}/${productId || 'draft'}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from('product-images').upload(path, variant.file, {
    cacheControl: '31536000',
    contentType: 'image/webp',
    upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  await trackUpload({
    file: variant.file,
    bucket: 'product-images',
    productId,
    path,
    publicUrl: data.publicUrl,
    assetKind,
  })
  return data.publicUrl
}

export async function uploadImageWithThumbnail(file, productId, assetKind = 'image') {
  if (!file) return { url: '', thumbnailUrl: '', displayUrl: '', width: null, height: null }
  requireSupabaseConfig()
  // LQIP thumbnail (~240px) and a mid-size display variant (~1280px). The
  // display variant is what cards/galleries actually show, so the multi-MB
  // source is never sent to the browser even when Image Transforms are off.
  const thumbnail = await createImageThumbnailFile(file)
  const display = await createImageThumbnailFile(file, { maxSide: 1280, quality: 0.8 })

  const url = await uploadAsset(file, 'product-images', productId, assetKind)
  const thumbnailUrl = await uploadImageVariant(thumbnail, {
    productId,
    folder: 'thumbs',
    assetKind: 'image_thumbnail',
  })
  const displayUrl = await uploadImageVariant(display, {
    productId,
    folder: 'displays',
    assetKind: 'image_display',
  })
  return {
    url,
    thumbnailUrl,
    displayUrl,
    width: thumbnail?.width ?? display?.width ?? null,
    height: thumbnail?.height ?? display?.height ?? null,
  }
}

export async function uploadModelSource(file, productId) {
  if (!hasSupabaseConfig) throw new Error('Supabase storage is required for auto-compression')
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `source/${productId || 'draft'}/${Date.now()}-${safeName}`
  await uploadStorageResumable(file, 'product-models', path, {
    contentType: modelContentType(file),
    cacheControl: '3600',
    upsert: true,
  })
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
  // Bypass supabase.functions.invoke — it wraps non-2xx responses in a
  // FunctionsHttpError that swallows the JSON body, so admins only see the
  // useless "Edge Function returned a non-2xx status code". A direct fetch
  // lets us read the function's actual error message and stage info.
  const session = (await supabase.auth.getSession()).data?.session
  const token = session?.access_token || supabaseAnonKeyPublic
  const url = `${supabaseUrlPublic}/functions/v1/compress-model`
  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKeyPublic,
      },
      body: JSON.stringify({
        sourcePath,
        productId: productId || null,
        sourceFileName: sourceFileName || null,
        sourceContentType: sourceContentType || null,
        force: force || false,
      }),
    })
  } catch (err) {
    throw new Error(`compress-model network error: ${err.message || err}`)
  }
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    // non-JSON body (e.g. proxy 502 HTML) — surface raw text below
  }
  if (!response.ok) {
    const reason = body?.error || text || response.statusText || 'unknown error'
    throw new Error(`compress-model failed (${response.status}): ${reason}`)
  }
  if (body?.error) throw new Error(body.error)
  return body
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
