import { useEffect, useMemo, useState } from 'react'
import Button from '../ui/Button'
import ProductModelPreview from './ProductModelPreview'
import { PRODUCT_PLACEHOLDER_IMAGE, normalizeProduct, slugify, uploadAsset } from '../../lib/productStore'

const emptyProduct = {
  name: '',
  slug: '',
  short_description: '',
  full_description: '',
  description: '',
  category_id: 'sofas',
  collection_id: '',
  tags: [],
  material: '',
  color: '',
  dimension_text: '',
  weight: '',
  brand: '',
  room_type: '',
  regular_price: 0,
  sale_price: '',
  currency: 'USD',
  discount_percentage: 0,
  cost_price: '',
  compare_at_price: '',
  stock_quantity: 0,
  sku: '',
  low_stock_threshold: 3,
  stock_status: 'out_of_stock',
  images: [],
  model_url: '',
  model_lite_url: '',
  model_poster_url: '',
  model_version: '',
  fallback_image_url: '',
  model_scale: 1,
  model_rotation: '0,0,0',
  model_format: 'glb',
  model_file_size: '',
  published: true,
  featured: false,
  new_arrival: false,
  best_seller: false,
  show_on_homepage: false,
  show_in_collection: true,
  delivery_estimate: '',
  assembly_required: false,
  care_instructions: '',
  warranty_info: '',
  return_eligible: true,
  seo_title: '',
  seo_description: '',
  og_image_url: '',
}

function Field({ label, children }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="admin-toggle">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export default function ProductFormPanel({ product, categories, collections, onClose, onSave }) {
  const [draft, setDraft] = useState(() => normalizeProduct(product || emptyProduct))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const isEditing = Boolean(product?.id)

  useEffect(() => {
    setDraft(normalizeProduct(product || emptyProduct))
  }, [product])

  const seoPreview = useMemo(() => ({
    title: draft.seo_title || `${draft.name || 'Product'} | Wood`,
    description: draft.seo_description || draft.short_description || draft.description,
  }), [draft])

  function update(key, value) {
    setDraft(current => {
      const next = { ...current, [key]: value }
      if (key === 'name' && !isEditing) next.slug = slugify(value)
      if (key === 'short_description') next.description = value
      return normalizeProduct(next)
    })
  }

  async function handleImageUpload(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setUploading(true)
    setError('')
    try {
      const urls = await Promise.all(files.map(file => uploadAsset(file, 'product-images', draft.id, 'image')))
      setDraft(current => {
        const currentImages = current.images.filter(image => image !== PRODUCT_PLACEHOLDER_IMAGE)
        return normalizeProduct({ ...current, images: [...currentImages, ...urls] })
      })
    } catch (err) {
      setError(err.message || 'Image upload failed')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function handleModelUpload(event, variant = 'full') {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadAsset(file, 'product-models', draft.id, variant === 'lite' ? 'lite_model' : 'model')
      setDraft(current => {
        const next = {
          ...current,
          model_version: String(Date.now()),
        }
        if (variant === 'lite') {
          next.model_lite_url = url
        } else {
          next.model_url = url
          next.model_format = file.name.toLowerCase().endsWith('.gltf') ? 'gltf' : 'glb'
          next.model_file_size = file.size
        }
        return normalizeProduct(next)
      })
    } catch (err) {
      setError(err.message || 'Model upload failed')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function handlePosterUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadAsset(file, 'product-images', draft.id, 'poster')
      setDraft(current => normalizeProduct({
        ...current,
        model_poster_url: url,
        fallback_image_url: url,
        og_image_url: current.og_image_url || url,
      }))
    } catch (err) {
      setError(err.message || 'Poster upload failed')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  function moveImage(index, direction) {
    const nextImages = [...draft.images]
    const target = index + direction
    if (target < 0 || target >= nextImages.length) return
    const [image] = nextImages.splice(index, 1)
    nextImages.splice(target, 0, image)
    update('images', nextImages)
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(normalizeProduct({
        ...draft,
        previous_stock_quantity: product?.stock_quantity,
        seo_title: draft.seo_title || seoPreview.title,
        seo_description: draft.seo_description || seoPreview.description,
      }))
      onClose()
    } catch (err) {
      setError(err.message || 'Product save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-sheet-backdrop" role="presentation">
      <aside className="admin-sheet" aria-label={isEditing ? 'Edit product' : 'Add product'}>
        <form onSubmit={submit}>
          <header className="admin-sheet-header">
            <div>
              <p className="admin-kicker">{isEditing ? 'Edit' : 'New'}</p>
              <h2>{isEditing ? draft.name : 'Add product'}</h2>
            </div>
            <button type="button" className="admin-icon-button pressable" onClick={onClose} aria-label="Close product form">×</button>
          </header>

          {error && <p className="admin-error" role="alert">{error}</p>}

          <section className="admin-form-section">
            <h3>Basic</h3>
            <div className="admin-form-grid">
              <Field label="Product name"><input value={draft.name} onChange={event => update('name', event.target.value)} required /></Field>
              <Field label="Slug"><input value={draft.slug} onChange={event => update('slug', slugify(event.target.value))} required /></Field>
              <Field label="Category"><select value={draft.category_id} onChange={event => update('category_id', event.target.value)}>{categories.map(category => <option key={category.id} value={category.slug || category.id}>{category.name}</option>)}</select></Field>
              <Field label="Collection"><select value={draft.collection_id} onChange={event => update('collection_id', event.target.value)}><option value="">None</option>{collections.map(collection => <option key={collection.id} value={collection.slug || collection.id}>{collection.name}</option>)}</select></Field>
              <Field label="Short description"><textarea value={draft.short_description} onChange={event => update('short_description', event.target.value)} rows="3" /></Field>
              <Field label="Full description"><textarea value={draft.full_description} onChange={event => update('full_description', event.target.value)} rows="3" /></Field>
              <Field label="Tags"><input value={draft.tags.join(', ')} onChange={event => update('tags', event.target.value.split(',').map(tag => tag.trim()).filter(Boolean))} placeholder="sofa, oak, modular" /></Field>
              <Field label="Material"><input value={draft.material} onChange={event => update('material', event.target.value)} /></Field>
              <Field label="Color"><input value={draft.color || ''} onChange={event => update('color', event.target.value)} /></Field>
              <Field label="Dimensions"><input value={draft.dimension_text || ''} onChange={event => update('dimension_text', event.target.value)} placeholder="220W x 95D x 78H cm" /></Field>
              <Field label="Weight"><input value={draft.weight || ''} onChange={event => update('weight', event.target.value)} /></Field>
              <Field label="Brand/designer"><input value={draft.brand || ''} onChange={event => update('brand', event.target.value)} /></Field>
              <Field label="Room type"><input value={draft.room_type || ''} onChange={event => update('room_type', event.target.value)} /></Field>
            </div>
          </section>

          <section className="admin-form-section">
            <h3>Pricing</h3>
            <div className="admin-form-grid admin-form-grid-compact">
              <Field label="Regular price"><input type="number" min="0" value={draft.regular_price} onChange={event => update('regular_price', event.target.value)} /></Field>
              <Field label="Sale price"><input type="number" min="0" value={draft.sale_price} onChange={event => update('sale_price', event.target.value)} /></Field>
              <Field label="Currency"><input value={draft.currency} onChange={event => update('currency', event.target.value.toUpperCase())} /></Field>
              <Field label="Compare-at"><input type="number" min="0" value={draft.compare_at_price || ''} onChange={event => update('compare_at_price', event.target.value)} /></Field>
              <Field label="Cost price"><input type="number" min="0" value={draft.cost_price || ''} onChange={event => update('cost_price', event.target.value)} /></Field>
              <Field label="Discount %"><input type="number" min="0" max="100" value={draft.discount_percentage || 0} onChange={event => update('discount_percentage', event.target.value)} /></Field>
            </div>
          </section>

          <section className="admin-form-section">
            <h3>Inventory</h3>
            <div className="admin-form-grid admin-form-grid-compact">
              <Field label="Stock quantity"><input type="number" min="0" value={draft.stock_quantity} onChange={event => update('stock_quantity', event.target.value)} /></Field>
              <Field label="SKU"><input value={draft.sku || ''} onChange={event => update('sku', event.target.value)} /></Field>
              <Field label="Low stock threshold"><input type="number" min="0" value={draft.low_stock_threshold} onChange={event => update('low_stock_threshold', event.target.value)} /></Field>
              <Field label="Stock status"><select value={draft.stock_status} onChange={event => update('stock_status', event.target.value)}><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option><option value="preorder">Preorder</option></select></Field>
            </div>
            <p className="admin-helper">Quantity 0 automatically marks the product out of stock.</p>
          </section>

          <section className="admin-form-section">
            <h3>Media</h3>
            <div className="admin-upload-row">
              <label className="admin-upload pressable">Upload images<input type="file" accept="image/*" multiple onChange={handleImageUpload} /></label>
              <label className="admin-upload pressable">Upload full model<input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={event => handleModelUpload(event, 'full')} /></label>
              <label className="admin-upload admin-upload-secondary pressable">Upload lite model<input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={event => handleModelUpload(event, 'lite')} /></label>
              <label className="admin-upload admin-upload-secondary pressable">Upload model poster<input type="file" accept="image/*" onChange={handlePosterUpload} /></label>
              {uploading && <span className="admin-helper">Uploading...</span>}
            </div>
            <div className="admin-image-strip">
              {draft.images.map((image, index) => (
                <figure key={`${image}-${index}`}>
                  <img src={image} alt="" />
                  <figcaption>
                    <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0}>←</button>
                    <button type="button" onClick={() => moveImage(index, 1)} disabled={index === draft.images.length - 1}>→</button>
                    <button type="button" onClick={() => update('images', draft.images.filter((_, imageIndex) => imageIndex !== index))}>Delete</button>
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="admin-form-grid admin-form-grid-compact">
              <Field label="Full model URL"><input value={draft.model_url || ''} onChange={event => update('model_url', event.target.value)} placeholder="Desktop .glb or .gltf" /></Field>
              <Field label="Model scale"><input type="number" step="0.1" value={draft.model_scale || 1} onChange={event => update('model_scale', event.target.value)} /></Field>
              <Field label="Model rotation"><input value={draft.model_rotation || '0,0,0'} onChange={event => update('model_rotation', event.target.value)} placeholder="0,0,0" /></Field>
              <Field label="Lite model URL"><input value={draft.model_lite_url || ''} onChange={event => update('model_lite_url', event.target.value)} placeholder="Optimized mobile .glb" /></Field>
              <Field label="Poster URL"><input value={draft.model_poster_url || ''} onChange={event => update('model_poster_url', event.target.value)} placeholder="Model loading poster" /></Field>
              <Field label="Model version"><input value={draft.model_version || ''} onChange={event => update('model_version', event.target.value)} placeholder="Changes when model bytes change" /></Field>
              <Field label="Model format"><select value={draft.model_format || 'glb'} onChange={event => update('model_format', event.target.value)}><option value="glb">GLB</option><option value="gltf">glTF</option><option value="usdz">USDZ</option></select></Field>
              <Field label="Model file size"><input type="number" min="0" value={draft.model_file_size || ''} onChange={event => update('model_file_size', event.target.value)} placeholder="Bytes" /></Field>
              <Field label="Fallback image"><input value={draft.fallback_image_url || ''} onChange={event => update('fallback_image_url', event.target.value)} /></Field>
            </div>
            <div className="admin-asset-checklist">
              <span className={draft.model_url ? 'is-ready' : ''}>Full model</span>
              <span className={draft.model_lite_url ? 'is-ready' : ''}>Lite model</span>
              <span className={(draft.model_poster_url || draft.fallback_image_url) ? 'is-ready' : ''}>Poster</span>
              <span className={draft.model_version ? 'is-ready' : ''}>Versioned</span>
            </div>
            <p className="admin-helper">Production models should be published as full, lite, and poster assets. Use Draco or Meshopt compression before adding the final URLs here.</p>
            <ProductModelPreview modelUrl={draft.model_url} fallbackImage={draft.model_poster_url || draft.fallback_image_url || draft.images[0]} scale={draft.model_scale} rotation={draft.model_rotation} />
          </section>

          <section className="admin-form-section">
            <h3>Visibility</h3>
            <div className="admin-toggle-grid">
              {[
                ['published', 'Published'],
                ['featured', 'Featured'],
                ['new_arrival', 'New arrival'],
                ['best_seller', 'Best seller'],
                ['show_on_homepage', 'Homepage'],
                ['show_in_collection', 'Collection'],
              ].map(([key, label]) => <Toggle key={key} label={label} checked={draft[key]} onChange={value => update(key, value)} />)}
            </div>
          </section>

          <section className="admin-form-section">
            <h3>Shipping</h3>
            <div className="admin-form-grid">
              <Field label="Delivery estimate"><input value={draft.delivery_estimate || ''} onChange={event => update('delivery_estimate', event.target.value)} /></Field>
              <Field label="Care instructions"><textarea value={draft.care_instructions || ''} onChange={event => update('care_instructions', event.target.value)} rows="2" /></Field>
              <Field label="Warranty info"><input value={draft.warranty_info || ''} onChange={event => update('warranty_info', event.target.value)} /></Field>
              <div className="admin-toggle-grid">
                <Toggle label="Assembly required" checked={draft.assembly_required} onChange={value => update('assembly_required', value)} />
                <Toggle label="Return eligible" checked={draft.return_eligible} onChange={value => update('return_eligible', value)} />
              </div>
            </div>
          </section>

          <section className="admin-form-section">
            <h3>SEO</h3>
            <div className="admin-form-grid">
              <Field label="SEO title"><input value={draft.seo_title || ''} onChange={event => update('seo_title', event.target.value)} placeholder={seoPreview.title} /></Field>
              <Field label="SEO description"><textarea value={draft.seo_description || ''} onChange={event => update('seo_description', event.target.value)} placeholder={seoPreview.description} rows="2" /></Field>
              <Field label="Open Graph image"><input value={draft.og_image_url || ''} onChange={event => update('og_image_url', event.target.value)} /></Field>
            </div>
          </section>

          <footer className="admin-sheet-footer">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || uploading}>{saving ? 'Saving...' : 'Save product'}</Button>
          </footer>
        </form>
      </aside>
    </div>
  )
}
