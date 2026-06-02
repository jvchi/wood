import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../ui/Button'
import ProductModelPreview from './ProductModelPreview'
import { formatCameraCsv } from '../../lib/modelCamera'
import {
  PRODUCT_PLACEHOLDER_IMAGE,
  compressUploadedModel,
  deleteProductModelAssets,
  normalizeProduct,
  saveTaxonomy,
  slugify,
  uploadAsset,
  uploadImageWithThumbnail,
  uploadModelSource,
} from '../../lib/productStore'

function parseRotationCsv(value) {
  const parts = String(value || '0,0,0').split(',').map(part => Number(part.trim()))
  return [
    Number.isFinite(parts[0]) ? parts[0] : 0,
    Number.isFinite(parts[1]) ? parts[1] : 0,
    Number.isFinite(parts[2]) ? parts[2] : 0,
  ]
}

function formatRotationCsv(values) {
  return values.map(v => Number(v.toFixed(3))).join(',')
}

function RotationSliders({ value, onChange }) {
  const radians = parseRotationCsv(value)
  const setAxis = (index, next) => {
    const updated = [...radians]
    updated[index] = next
    onChange(formatRotationCsv(updated))
  }
  const reset = () => onChange('0,0,0')
  return (
    <div className="admin-rotation-sliders">
      {['X', 'Y', 'Z'].map((axis, index) => {
        const rad = radians[index]
        const deg = Math.round((rad * 180) / Math.PI)
        return (
          <div key={axis} className="admin-rotation-row">
            <span className="admin-rotation-label">{axis}</span>
            <input
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step={0.01}
              value={rad}
              onChange={event => setAxis(index, Number(event.target.value))}
            />
            <span className="admin-rotation-value">{deg}°</span>
          </div>
        )
      })}
      <button type="button" className="admin-rotation-reset" onClick={reset}>Reset</button>
    </div>
  )
}

function PositionNudgeControls({ onNudge, onReset }) {
  const step = 0.18
  return (
    <div className="admin-position-nudge" aria-label="Position framing controls">
      <button type="button" className="admin-position-nudge-button" onClick={() => onNudge(0, -step)} aria-label="Move frame up">↑</button>
      <button type="button" className="admin-position-nudge-button" onClick={() => onNudge(step, 0)} aria-label="Move frame left">←</button>
      <button type="button" className="admin-position-nudge-button" onClick={onReset} aria-label="Reset position">•</button>
      <button type="button" className="admin-position-nudge-button" onClick={() => onNudge(-step, 0)} aria-label="Move frame right">→</button>
      <button type="button" className="admin-position-nudge-button" onClick={() => onNudge(0, step)} aria-label="Move frame down">↓</button>
    </div>
  )
}

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
  image_thumbnails: [],
  model_url: '',
  model_lite_url: '',
  model_poster_url: '',
  model_version: '',
  fallback_image_url: '',
  model_scale: 1,
  model_rotation: '0,0,0',
  model_camera: '',
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

const DIMENSION_UNITS = ['cm', 'in', 'mm']

function parseDimensionText(text) {
  if (!text) return { width: '', depth: '', height: '', unit: 'cm' }
  const unitMatch = String(text).match(/(cm|mm|in|inches|")\s*$/i)
  let unit = 'cm'
  if (unitMatch) {
    const u = unitMatch[1].toLowerCase()
    unit = u === 'inches' || u === '"' ? 'in' : u
  }
  const numbers = String(text).match(/-?\d+(?:\.\d+)?/g) || []
  return {
    width: numbers[0] ?? '',
    depth: numbers[1] ?? '',
    height: numbers[2] ?? '',
    unit,
  }
}

function formatDimensionText({ width, depth, height, unit }) {
  if (width === '' && depth === '' && height === '') return ''
  const parts = [
    width !== '' ? `${width}W` : null,
    depth !== '' ? `${depth}D` : null,
    height !== '' ? `${height}H` : null,
  ].filter(Boolean)
  return `${parts.join(' x ')} ${unit}`.trim()
}

function DimensionInput({ value, onChange }) {
  const parsed = parseDimensionText(value)
  const set = (key, next) => onChange(formatDimensionText({ ...parsed, [key]: next }))
  return (
    <div className="admin-dimension-input">
      <input type="number" inputMode="decimal" placeholder="W" value={parsed.width} onChange={e => set('width', e.target.value)} />
      <span aria-hidden>×</span>
      <input type="number" inputMode="decimal" placeholder="D" value={parsed.depth} onChange={e => set('depth', e.target.value)} />
      <span aria-hidden>×</span>
      <input type="number" inputMode="decimal" placeholder="H" value={parsed.height} onChange={e => set('height', e.target.value)} />
      <select value={parsed.unit} onChange={e => set('unit', e.target.value)}>
        {DIMENSION_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
    </div>
  )
}

const WEIGHT_UNITS = ['kg', 'lb', 'g']

function parseWeight(text) {
  if (!text) return { amount: '', unit: 'kg' }
  const match = String(text).match(/(-?\d+(?:\.\d+)?)\s*(kg|lb|lbs|g)?/i)
  if (!match) return { amount: '', unit: 'kg' }
  const unit = (match[2] || 'kg').toLowerCase().replace('lbs', 'lb')
  return { amount: match[1], unit }
}

function formatWeight({ amount, unit }) {
  if (amount === '') return ''
  return `${amount} ${unit}`
}

function WeightInput({ value, onChange }) {
  const parsed = parseWeight(value)
  const set = (key, next) => onChange(formatWeight({ ...parsed, [key]: next }))
  return (
    <div className="admin-weight-input">
      <input type="number" inputMode="decimal" placeholder="0" value={parsed.amount} onChange={e => set('amount', e.target.value)} />
      <select value={parsed.unit} onChange={e => set('unit', e.target.value)}>
        {WEIGHT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
    </div>
  )
}

function TagChips({ value, onChange, placeholder }) {
  const [input, setInput] = useState('')
  const tags = Array.isArray(value) ? value : []
  function commit(raw) {
    const parts = String(raw).split(',').map(t => t.trim()).filter(Boolean)
    if (!parts.length) return
    const next = [...tags]
    for (const tag of parts) if (!next.includes(tag)) next.push(tag)
    onChange(next)
    setInput('')
  }
  function handleKey(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit(input)
    } else if (event.key === 'Backspace' && !input && tags.length) {
      onChange(tags.slice(0, -1))
    }
  }
  return (
    <div className="admin-chip-input">
      {tags.map(tag => (
        <span key={tag} className="admin-chip">
          {tag}
          <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(tags.filter(t => t !== tag))}>×</button>
        </span>
      ))}
      <input
        value={input}
        placeholder={tags.length ? '' : placeholder}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => commit(input)}
      />
    </div>
  )
}

const ROOM_TYPE_OPTIONS = ['Living room', 'Bedroom', 'Dining room', 'Office', 'Outdoor', 'Kids', 'Hallway']

const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1 Square' },
  { value: '4:5', label: '4:5 Portrait' },
  { value: '3:4', label: '3:4 Portrait' },
  { value: '2:3', label: '2:3 Portrait' },
  { value: '16:9', label: '16:9 Landscape' },
  { value: '3:2', label: '3:2 Landscape' },
  { value: '9:16', label: '9:16 Vertical' },
]

const COMMON_ASPECTS = [
  ['1:1', 1],
  ['4:5', 4 / 5],
  ['5:4', 5 / 4],
  ['3:4', 3 / 4],
  ['4:3', 4 / 3],
  ['2:3', 2 / 3],
  ['3:2', 3 / 2],
  ['16:9', 16 / 9],
  ['9:16', 9 / 16],
]

function aspectLabel(w, h) {
  if (!w || !h) return ''
  const r = w / h
  let best = null
  let bestDiff = Infinity
  for (const [label, value] of COMMON_ASPECTS) {
    const diff = Math.abs(r - value) / value
    if (diff < bestDiff) {
      bestDiff = diff
      best = label
    }
  }
  return bestDiff < 0.025 ? best : `${w}×${h}`
}

const ASPECT_RATIO_MAP = {
  '1:1': [1, 1],
  '4:5': [4, 5],
  '3:4': [3, 4],
  '2:3': [2, 3],
  '16:9': [16, 9],
  '3:2': [3, 2],
  '9:16': [9, 16],
}

const DRAFT_STORAGE_PREFIX = 'wood:product-draft:'

function draftStorageKey(product) {
  return `${DRAFT_STORAGE_PREFIX}${product?.id || 'new'}`
}

function skuPart(value, fallback = 'PRD') {
  const part = slugify(value).replaceAll('-', '').toUpperCase()
  return (part || fallback).slice(0, 12)
}

function baseSkuForProduct(product) {
  const category = skuPart(product.category_id || product.category, 'CAT').slice(0, 3)
  const nameParts = slugify(product.name || 'product')
    .split('-')
    .filter(Boolean)
    .slice(0, 2)
    .join('-')
    .toUpperCase()

  return `${category}-${nameParts || 'PRODUCT'}`
}

function generateSku(product, products = []) {
  const base = baseSkuForProduct(product)
  const usedSkus = new Set(
    products
      .filter(item => item.id !== product.id)
      .map(item => String(item.sku || '').trim().toUpperCase())
      .filter(Boolean),
  )

  for (let index = 1; index < 1000; index += 1) {
    const sku = `${base}-${String(index).padStart(3, '0')}`
    if (!usedSkus.has(sku)) return sku
  }

  return `${base}-${Date.now().toString(36).toUpperCase()}`
}

function loadStoredDraft(product) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(draftStorageKey(product))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function ProductFormPanel({ product, categories, collections, products = [], onClose, onSave, onTaxonomyAdded }) {
  const [draft, setDraft] = useState(() => {
    const stored = loadStoredDraft(product)
    if (stored) return stored
    return product ? normalizeProduct(product) : { ...emptyProduct }
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [compressionStatus, setCompressionStatus] = useState('')
  const previewRef = useRef(null)
  const [draftRestored, setDraftRestored] = useState(() => Boolean(loadStoredDraft(product)))
  const [capturing, setCapturing] = useState(false)
  const [captureStatus, setCaptureStatus] = useState('')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [captureSize, setCaptureSize] = useState(3000)
  const [turntableCount, setTurntableCount] = useState(8)
  const [captureTransparent, setCaptureTransparent] = useState(true)
  const [savedViewThumb, setSavedViewThumb] = useState(null)
  const [imageAspects, setImageAspects] = useState({})
  const isEditing = Boolean(product?.id)
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(() => Boolean(product?.sku || loadStoredDraft(product)?.sku))
  const lastAutoSkuRef = useRef('')
  const draftId = draft.id
  const draftName = draft.name
  const draftCategoryId = draft.category_id

  function handleImageMeta(image, event) {
    const { naturalWidth, naturalHeight } = event.currentTarget
    if (!naturalWidth || !naturalHeight) return
    setImageAspects(current => {
      if (current[image]?.w === naturalWidth && current[image]?.h === naturalHeight) return current
      return { ...current, [image]: { w: naturalWidth, h: naturalHeight } }
    })
  }

  useEffect(() => {
    const stored = loadStoredDraft(product)
    if (stored) {
      setDraft(stored)
      setDraftRestored(true)
      setSkuManuallyEdited(Boolean(stored.sku))
    } else {
      setDraft(product ? normalizeProduct(product) : { ...emptyProduct })
      setDraftRestored(false)
      setSkuManuallyEdited(Boolean(product?.sku))
    }
    lastAutoSkuRef.current = ''
  }, [product])

  useEffect(() => {
    if (isEditing || skuManuallyEdited || !draftName) return
    const previousAutoSku = lastAutoSkuRef.current
    const nextSku = generateSku({ id: draftId, name: draftName, category_id: draftCategoryId }, products)
    setDraft(current => {
      if (current.sku && previousAutoSku && current.sku !== previousAutoSku) return current
      lastAutoSkuRef.current = nextSku
      return { ...current, sku: nextSku }
    })
  }, [draftCategoryId, draftId, draftName, isEditing, products, skuManuallyEdited])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(draftStorageKey(product), JSON.stringify(draft))
    } catch {
      // quota or serialization issue — ignore, draft persistence is best-effort
    }
  }, [draft, product])

  function clearStoredDraft() {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(draftStorageKey(product))
    } catch {
      // ignore
    }
    setDraftRestored(false)
  }

  function discardDraft() {
    clearStoredDraft()
    setDraft(product ? normalizeProduct(product) : { ...emptyProduct })
    setSkuManuallyEdited(Boolean(product?.sku))
    lastAutoSkuRef.current = ''
  }

  function handleCancel() {
    clearStoredDraft()
    onClose()
  }

  async function handleAddTaxonomy(type) {
    const label = type === 'category' ? 'category' : 'collection'
    const name = window.prompt(`New ${label} name`)?.trim()
    if (!name) return
    try {
      const created = await saveTaxonomy(type, { name, slug: slugify(name) })
      onTaxonomyAdded?.(type, created)
      const value = created.slug || created.id
      update(type === 'category' ? 'category_id' : 'collection_id', value)
    } catch (err) {
      setError(err.message || `Could not add ${label}`)
    }
  }

  const seoPreview = useMemo(() => ({
    title: draft.seo_title || `${draft.name || 'Product'} | Wood`,
    description: draft.seo_description || draft.short_description || draft.description,
  }), [draft])

  function update(key, value) {
    setDraft(current => {
      const next = { ...current, [key]: value }
      if (key === 'name' && !isEditing) next.slug = slugify(value)
      if (key === 'short_description') next.description = value
      return next
    })
  }

  function updateSku(value) {
    setSkuManuallyEdited(true)
    update('sku', String(value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+/, ''))
  }

  function regenerateSku() {
    const nextSku = generateSku(draft, products)
    lastAutoSkuRef.current = nextSku
    setSkuManuallyEdited(false)
    update('sku', nextSku)
  }

  async function handleImageUpload(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setUploading(true)
    setError('')
    try {
      const uploaded = await Promise.all(files.map(file => uploadImageWithThumbnail(file, draft.id, 'image')))
      setDraft(current => {
        const currentImages = (current.images || []).filter(image => image !== PRODUCT_PLACEHOLDER_IMAGE)
        const currentThumbnails = (current.image_thumbnails || []).slice(0, currentImages.length)
        return {
          ...current,
          images: [...currentImages, ...uploaded.map(image => image.url)],
          image_thumbnails: [...currentThumbnails, ...uploaded.map(image => image.thumbnailUrl || '')],
        }
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
        return next
      })
    } catch (err) {
      setError(err.message || 'Model upload failed')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function handleAutoCompressUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    setCompressionStatus('Uploading source...')
    try {
      const sourcePath = await uploadModelSource(file, draft.id)
      setCompressionStatus('Compressing — this can take 30–90s for large models...')
      const result = await compressUploadedModel({
        sourcePath,
        productId: draft.id,
        sourceFileName: file.name,
        sourceContentType: file.type || 'model/gltf-binary',
      })
      setDraft(current => ({
        ...current,
        model_url: result.fullUrl,
        model_lite_url: result.liteUrl,
        model_format: 'glb',
        model_file_size: result.fullSize,
        model_version: result.version || String(Date.now()),
      }))

      const fmt = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`
      setCompressionStatus(
        result.skippedCompression
          ? `Done · ${fmt(result.sourceSize)} (under 5MB, compression skipped)`
          : `Done · source ${fmt(result.sourceSize)} → full ${fmt(result.fullSize)} · lite ${fmt(result.liteSize)}`,
      )
    } catch (err) {
      setError(err.message || 'Auto-compression failed')
      setCompressionStatus('')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function handleSaveCamera() {
    const state = previewRef.current?.getCameraState?.()
    if (!state) return
    update('model_camera', formatCameraCsv(state))
    // Capture a small local-only preview so the admin can eyeball the saved
    // framing without uploading anything. Failure here is non-fatal.
    try {
      if (previewRef.current?.isReady?.()) {
        const blob = await previewRef.current.captureSnapshot({
          width: 480,
          height: 480,
          supersample: 1,
          transparent: true,
        })
        if (blob) {
          if (savedViewThumb) URL.revokeObjectURL(savedViewThumb)
          setSavedViewThumb(URL.createObjectURL(blob))
        }
      }
    } catch {
      // ignore — thumbnail is just a UX nicety
    }
  }

  function handleResetCamera() {
    previewRef.current?.resetCamera?.()
    update('model_camera', '')
    if (savedViewThumb) {
      URL.revokeObjectURL(savedViewThumb)
      setSavedViewThumb(null)
    }
  }

  function handleResetPosition() {
    const nextState = previewRef.current?.resetPosition?.()
    if (nextState) update('model_camera', formatCameraCsv(nextState))
  }

  function handleNudgeCamera(deltaX, deltaY) {
    const nextState = previewRef.current?.panBy?.(deltaX, deltaY)
    if (nextState) update('model_camera', formatCameraCsv(nextState))
  }

  function computeResolution() {
    const [rw, rh] = ASPECT_RATIO_MAP[aspectRatio] || [1, 1]
    const longest = Math.max(1000, Math.min(6000, Number(captureSize) || 3000))
    if (rw >= rh) {
      return { width: longest, height: Math.round((longest * rh) / rw) }
    }
    return { width: Math.round((longest * rw) / rh), height: longest }
  }

  const aspectRatioValue = (() => {
    const [rw, rh] = ASPECT_RATIO_MAP[aspectRatio] || [1, 1]
    return rw / rh
  })()

  async function uploadCaptureBlob(blob, label) {
    const safeName = `${slugify(draft.name || 'product') || 'product'}-${label}-${Date.now()}.png`
    const file = new File([blob], safeName, { type: 'image/png' })
    return uploadImageWithThumbnail(file, draft.id, 'image')
  }

  async function handleCaptureSnapshot() {
    if (capturing) return
    if (!previewRef.current?.isReady?.()) {
      setError('Model is still loading. Wait a moment and try again.')
      return
    }
    setCapturing(true)
    setError('')
    setCaptureStatus('Rendering HD snapshot...')
    try {
      const { width, height } = computeResolution()
      const blob = await previewRef.current.captureSnapshot({
        width,
        height,
        supersample: 2,
        transparent: captureTransparent,
        aspectRatio: aspectRatioValue,
      })
      if (!blob) throw new Error('Capture returned no image')
      setCaptureStatus('Uploading...')
      const uploaded = await uploadCaptureBlob(blob, 'hero')
      setDraft(current => {
        const currentImages = (current.images || []).filter(image => image !== PRODUCT_PLACEHOLDER_IMAGE)
        const currentThumbnails = (current.image_thumbnails || []).slice(0, currentImages.length)
        return {
          ...current,
          images: [...currentImages, uploaded.url],
          image_thumbnails: [...currentThumbnails, uploaded.thumbnailUrl || ''],
        }
      })
      setCaptureStatus(`Saved · ${width}×${height}`)
    } catch (err) {
      setError(err.message || 'Capture failed')
      setCaptureStatus('')
    } finally {
      setCapturing(false)
    }
  }

  async function handleCaptureTurntable() {
    if (capturing) return
    if (!previewRef.current?.isReady?.()) {
      setError('Model is still loading. Wait a moment and try again.')
      return
    }
    const count = Math.max(2, Math.min(36, Number(turntableCount) || 8))
    setCapturing(true)
    setError('')
    setCaptureStatus(`Rendering ${count} angles...`)
    try {
      const { width, height } = computeResolution()
      const blobs = await previewRef.current.captureTurntable(count, {
        width,
        height,
        supersample: 2,
        transparent: captureTransparent,
        aspectRatio: aspectRatioValue,
        onProgress: (done, total) => setCaptureStatus(`Rendering ${done}/${total}...`),
      })
      if (!blobs?.length) throw new Error('No frames captured')
      setCaptureStatus(`Uploading ${blobs.length} images...`)
      const uploaded = []
      for (let i = 0; i < blobs.length; i += 1) {
        const image = await uploadCaptureBlob(blobs[i], `angle-${String(i + 1).padStart(2, '0')}`)
        uploaded.push(image)
        setCaptureStatus(`Uploading ${i + 1}/${blobs.length}...`)
      }
      setDraft(current => {
        const currentImages = (current.images || []).filter(image => image !== PRODUCT_PLACEHOLDER_IMAGE)
        const currentThumbnails = (current.image_thumbnails || []).slice(0, currentImages.length)
        return {
          ...current,
          images: [...currentImages, ...uploaded.map(image => image.url)],
          image_thumbnails: [...currentThumbnails, ...uploaded.map(image => image.thumbnailUrl || '')],
        }
      })
      setCaptureStatus(`Saved · ${uploaded.length} × ${width}×${height}`)
    } catch (err) {
      setError(err.message || 'Turntable capture failed')
      setCaptureStatus('')
    } finally {
      setCapturing(false)
    }
  }

  async function handleRemoveModel() {
    const snapshot = {
      modelUrl: draft.model_url,
      modelLiteUrl: draft.model_lite_url,
      modelPosterUrl: draft.model_poster_url,
      productId: draft.id,
    }
    setDraft(current => ({
      ...current,
      model_url: '',
      model_lite_url: '',
      model_poster_url: '',
      model_version: '',
      model_file_size: '',
      fallback_image_url: '',
    }))
    setCompressionStatus('')
    setError('')
    try {
      await deleteProductModelAssets(snapshot)
    } catch (err) {
      console.warn('Storage cleanup failed:', err)
    }
  }

  async function handlePosterUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadAsset(file, 'product-images', draft.id, 'poster')
      setDraft(current => ({
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
    const nextThumbnails = [...(draft.image_thumbnails || [])]
    const target = index + direction
    if (target < 0 || target >= nextImages.length) return
    const [image] = nextImages.splice(index, 1)
    nextImages.splice(target, 0, image)
    const [thumbnail] = nextThumbnails.splice(index, 1)
    nextThumbnails.splice(target, 0, thumbnail || '')
    setDraft(current => ({
      ...current,
      images: nextImages,
      image_thumbnails: nextThumbnails,
    }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const normalizedSku = String(draft.sku || '').trim().toUpperCase()
      const duplicateSku = normalizedSku && products.some(item => (
        item.id !== draft.id &&
        String(item.sku || '').trim().toUpperCase() === normalizedSku
      ))
      if (duplicateSku) throw new Error(`SKU "${normalizedSku}" is already used by another product.`)
      await onSave(normalizeProduct({
        ...draft,
        sku: normalizedSku,
        previous_stock_quantity: product?.stock_quantity,
        seo_title: draft.seo_title || seoPreview.title,
        seo_description: draft.seo_description || seoPreview.description,
      }))
      clearStoredDraft()
      onClose()
    } catch (err) {
      setError(err.message || 'Product save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-sheet-backdrop" role="presentation">
      <aside className="admin-sheet" data-lenis-prevent aria-label={isEditing ? 'Edit product' : 'Add product'}>
        <form onSubmit={submit}>
          <header className="admin-sheet-header">
            <div>
              <p className="admin-kicker">{isEditing ? 'Edit' : 'New'}</p>
              <h2>{isEditing ? draft.name : 'Add product'}</h2>
            </div>
            <button type="button" className="admin-icon-button pressable" onClick={handleCancel} aria-label="Close product form">×</button>
          </header>

          {error && <p className="admin-error" role="alert">{error}</p>}

          {draftRestored && (
            <p className="admin-helper" role="status" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span>Restored unsaved draft.</span>
              <button type="button" className="admin-rotation-reset" onClick={discardDraft}>Discard draft</button>
            </p>
          )}

          <section className="admin-form-section">
            <h3>Basic</h3>
            <div className="admin-form-grid">
              <Field label="Product name"><input value={draft.name} onChange={event => update('name', event.target.value)} required /></Field>
              <Field label="Slug"><input value={draft.slug} onChange={event => update('slug', slugify(event.target.value))} required /></Field>
              <Field label="Category">
                <div className="admin-taxonomy-select">
                  <select value={draft.category_id} onChange={event => update('category_id', event.target.value)}>
                    {categories.map(category => <option key={category.id} value={category.slug || category.id}>{category.name}</option>)}
                  </select>
                  <button type="button" className="admin-taxonomy-add pressable" onClick={() => handleAddTaxonomy('category')} aria-label="Add new category">+ New</button>
                </div>
              </Field>
              <Field label="Collection">
                <div className="admin-taxonomy-select">
                  <select value={draft.collection_id} onChange={event => update('collection_id', event.target.value)}>
                    <option value="">None</option>
                    {collections.map(collection => <option key={collection.id} value={collection.slug || collection.id}>{collection.name}</option>)}
                  </select>
                  <button type="button" className="admin-taxonomy-add pressable" onClick={() => handleAddTaxonomy('collection')} aria-label="Add new collection">+ New</button>
                </div>
              </Field>
              <Field label="Short description"><textarea value={draft.short_description} onChange={event => update('short_description', event.target.value)} rows="3" /></Field>
              <Field label="Full description"><textarea value={draft.full_description} onChange={event => update('full_description', event.target.value)} rows="3" /></Field>
              <Field label="Tags"><TagChips value={draft.tags} onChange={value => update('tags', value)} placeholder="Type a tag, press Enter" /></Field>
              <Field label="Material"><input value={draft.material} onChange={event => update('material', event.target.value)} placeholder="oak, brass" /></Field>
              <Field label="Color"><input value={draft.color || ''} onChange={event => update('color', event.target.value)} /></Field>
              <Field label="Dimensions"><DimensionInput value={draft.dimension_text || ''} onChange={value => update('dimension_text', value)} /></Field>
              <Field label="Weight"><WeightInput value={draft.weight || ''} onChange={value => update('weight', value)} /></Field>
              <Field label="Brand/designer"><input value={draft.brand || ''} onChange={event => update('brand', event.target.value)} /></Field>
              <Field label="Room type">
                <select value={ROOM_TYPE_OPTIONS.includes(draft.room_type) ? draft.room_type : (draft.room_type ? '__custom__' : '')} onChange={event => {
                  if (event.target.value === '__custom__') return
                  update('room_type', event.target.value)
                }}>
                  <option value="">Select room…</option>
                  {ROOM_TYPE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                  <option value="__custom__">Custom…</option>
                </select>
                {(!ROOM_TYPE_OPTIONS.includes(draft.room_type) && draft.room_type !== undefined) && (
                  <input value={draft.room_type || ''} onChange={event => update('room_type', event.target.value)} placeholder="Custom room type" style={{ marginTop: '0.4rem' }} />
                )}
              </Field>
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
              <Field label="SKU">
                <div className="admin-taxonomy-select">
                  <input value={draft.sku || ''} onChange={event => updateSku(event.target.value)} placeholder="Auto-generated" />
                  <button type="button" className="admin-taxonomy-add pressable" onClick={regenerateSku}>Regenerate</button>
                </div>
              </Field>
              <Field label="Low stock threshold"><input type="number" min="0" value={draft.low_stock_threshold} onChange={event => update('low_stock_threshold', event.target.value)} /></Field>
              <Field label="Stock status"><select value={draft.stock_status} onChange={event => update('stock_status', event.target.value)}><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option><option value="preorder">Preorder</option></select></Field>
            </div>
            <p className="admin-helper">Quantity 0 automatically marks the product out of stock.</p>
          </section>

          <section className="admin-form-section">
            <h3>Media</h3>
            <div className="admin-upload-row">
              <label className="admin-upload pressable">Upload images<input type="file" accept="image/*" multiple onChange={handleImageUpload} /></label>
              <label className="admin-upload pressable">Upload &amp; auto-compress model<input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={handleAutoCompressUpload} /></label>
              <label className="admin-upload admin-upload-secondary pressable">Upload pre-built full<input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={event => handleModelUpload(event, 'full')} /></label>
              <label className="admin-upload admin-upload-secondary pressable">Upload pre-built lite<input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={event => handleModelUpload(event, 'lite')} /></label>
              <label className="admin-upload admin-upload-secondary pressable">Upload model poster<input type="file" accept="image/*" onChange={handlePosterUpload} /></label>
              {(draft.model_url || draft.model_lite_url || draft.model_poster_url) && (
                <button
                  type="button"
                  className="admin-upload admin-upload-danger pressable"
                  onClick={handleRemoveModel}
                  disabled={uploading}
                >
                  Remove model
                </button>
              )}
              {uploading && <span className="admin-helper">Uploading...</span>}
            </div>
            {compressionStatus && <p className="admin-helper" role="status">{compressionStatus}</p>}
            <div className="admin-image-strip">
              {draft.images.map((image, index) => {
                const isFallback = (draft.fallback_image_url || draft.model_poster_url) === image
                const meta = imageAspects[image]
                const ratio = meta ? meta.w / meta.h : 1
                const ratioLabel = meta ? aspectLabel(meta.w, meta.h) : ''
                return (
                  <figure key={`${image}-${index}`} className={isFallback ? 'is-fallback' : ''}>
                    <div className="admin-image-strip-thumb" style={{ '--thumb-ratio': ratio }}>
                      <img src={image} alt="" onLoad={event => handleImageMeta(image, event)} />
                      {ratioLabel && <span className="admin-image-strip-aspect">{ratioLabel}</span>}
                      {isFallback && <span className="admin-image-strip-badge">Fallback</span>}
                      <div className="admin-image-strip-hover">
                        <button
                          type="button"
                          className="admin-image-strip-hover-action"
                          onClick={() => setDraft(current => ({
                            ...current,
                            fallback_image_url: image,
                            model_poster_url: image,
                            og_image_url: current.og_image_url || image,
                          }))}
                          disabled={isFallback}
                        >
                          {isFallback ? 'Fallback frame' : 'Use as fallback'}
                        </button>
                      </div>
                    </div>
                    <figcaption>
                      <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0}>←</button>
                      <button type="button" onClick={() => moveImage(index, 1)} disabled={index === draft.images.length - 1}>→</button>
                      <button
                        type="button"
                        onClick={() => setDraft(current => ({
                          ...current,
                          images: current.images.filter((_, imageIndex) => imageIndex !== index),
                          image_thumbnails: (current.image_thumbnails || []).filter((_, imageIndex) => imageIndex !== index),
                        }))}
                      >Delete</button>
                    </figcaption>
                  </figure>
                )
              })}
            </div>
            <div className="admin-form-grid admin-form-grid-compact">
              <Field label="Full model URL"><input value={draft.model_url || ''} onChange={event => update('model_url', event.target.value)} placeholder="Desktop .glb or .gltf" /></Field>
              <Field label="Model scale"><input type="number" step="0.1" value={draft.model_scale || 1} onChange={event => update('model_scale', event.target.value)} /></Field>
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
            <div className="admin-model-preview-wrapper">
              <p className="admin-helper">Drag to rotate · scroll/pinch to zoom · use Position to pan the frame · this frame matches the live product page. Click <strong>Save view</strong> to lock the camera shoppers see first.</p>
              <ProductModelPreview
                ref={previewRef}
                modelUrl={draft.model_url}
                fallbackImage={draft.model_poster_url || draft.fallback_image_url || draft.images[0]}
                scale={draft.model_scale}
                rotation={draft.model_rotation}
                camera={draft.model_camera}
                aspectRatio={aspectRatioValue}
                aspectLabel={aspectRatio}
                showAspectGhost={!capturing}
              />
              {draft.model_url && (
                <>
                  <div className="admin-model-preview-rotation">
                    <span className="admin-model-preview-rotation-label">Rotation</span>
                    <RotationSliders value={draft.model_rotation || '0,0,0'} onChange={value => update('model_rotation', value)} />
                  </div>
                  <div className="admin-model-preview-rotation admin-model-preview-position">
                    <span className="admin-model-preview-rotation-label">Position</span>
                    <PositionNudgeControls onNudge={handleNudgeCamera} onReset={handleResetPosition} />
                  </div>
                  <div className="admin-model-preview-toolbar">
                    <button type="button" className="pressable admin-model-preview-action" onClick={handleSaveCamera}>
                      Save view
                    </button>
                    <button type="button" className="pressable admin-model-preview-action admin-model-preview-action-secondary" onClick={handleResetCamera}>
                      Reset view
                    </button>
                    {draft.model_camera && (
                      <span className="admin-helper admin-model-preview-status">View saved</span>
                    )}
                    {savedViewThumb && (
                      <figure className="admin-saved-view-thumb">
                        <img src={savedViewThumb} alt="Saved view preview" />
                        <figcaption>Saved framing</figcaption>
                      </figure>
                    )}
                  </div>
                  <div className="admin-model-preview-toolbar">
                    <select
                      value={aspectRatio}
                      onChange={event => setAspectRatio(event.target.value)}
                      disabled={capturing}
                      aria-label="Aspect ratio"
                    >
                      {ASPECT_RATIO_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <select
                      value={captureSize}
                      onChange={event => setCaptureSize(Number(event.target.value))}
                      disabled={capturing}
                      aria-label="Capture size"
                    >
                      <option value={1500}>1.5K</option>
                      <option value={2000}>2K</option>
                      <option value={3000}>3K</option>
                      <option value={4000}>4K</option>
                      <option value={6000}>6K</option>
                    </select>
                    <label className="admin-toggle" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={captureTransparent}
                        onChange={event => setCaptureTransparent(event.target.checked)}
                        disabled={capturing}
                      />
                      <span>Transparent BG</span>
                    </label>
                    <button
                      type="button"
                      className="pressable admin-model-preview-action"
                      onClick={handleCaptureSnapshot}
                      disabled={capturing}
                    >
                      {capturing ? 'Working…' : 'Capture HD image'}
                    </button>
                    <input
                      type="number"
                      min="2"
                      max="36"
                      value={turntableCount}
                      onChange={event => setTurntableCount(event.target.value)}
                      disabled={capturing}
                      style={{ width: '4.5rem' }}
                      aria-label="Turntable angle count"
                    />
                    <button
                      type="button"
                      className="pressable admin-model-preview-action admin-model-preview-action-secondary"
                      onClick={handleCaptureTurntable}
                      disabled={capturing}
                    >
                      Capture turntable
                    </button>
                    {captureStatus && (
                      <span className="admin-helper admin-model-preview-status">{captureStatus}</span>
                    )}
                  </div>
                </>
              )}
            </div>
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
            <Button type="button" variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button type="submit" disabled={saving || uploading}>{saving ? 'Saving...' : 'Save product'}</Button>
          </footer>
        </form>
      </aside>
    </div>
  )
}
