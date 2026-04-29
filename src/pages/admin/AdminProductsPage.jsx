import { useEffect, useMemo, useState } from 'react'
import { AdminIcon } from '../../components/admin/AdminIcons'
import ProductFormPanel from '../../components/admin/ProductFormPanel'
import { useProducts } from '../../hooks/useProducts'
import { deleteProduct, listCategories, listCollections, saveProduct } from '../../lib/productStore'
import { useToast } from '../../context/ToastContext'
import { formatPrice } from '../../utils/formatPrice'

const sorters = {
  newest: (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
  price: (a, b) => Number(b.price) - Number(a.price),
  name: (a, b) => a.name.localeCompare(b.name),
  stock: (a, b) => Number(b.stock_quantity) - Number(a.stock_quantity),
}

export default function AdminProductsPage() {
  const { products, loading } = useProducts({ includeUnpublished: true })
  const { addToast } = useToast()
  const [categories, setCategories] = useState([])
  const [collections, setCollections] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [stock, setStock] = useState('all')
  const [flag, setFlag] = useState('all')
  const [sort, setSort] = useState('newest')
  const [editingProduct, setEditingProduct] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    listCategories().then(setCategories)
    listCollections().then(setCollections)
  }, [])

  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        const haystack = `${product.name} ${product.sku} ${product.category} ${product.tags?.join(' ')}`.toLowerCase()
        if (query && !haystack.includes(query.toLowerCase())) return false
        if (category !== 'all' && product.category_id !== category && product.category !== category) return false
        if (stock !== 'all' && product.stock_status !== stock) return false
        if (flag === 'featured' && !product.featured) return false
        if (flag === 'new_arrival' && !product.new_arrival) return false
        if (flag === 'archived' && !product.archived) return false
        if (flag !== 'archived' && product.archived) return false
        return true
      })
      .sort(sorters[sort] || sorters.newest)
  }, [products, query, category, stock, flag, sort])

  async function persistProduct(product, message = 'Product saved') {
    await saveProduct(product)
    addToast(message)
  }

  async function handleDelete(product) {
    await deleteProduct(product.id)
    setConfirmDelete(null)
    addToast(`${product.name} deleted`)
  }

  async function duplicateProduct(product) {
    const newId = crypto.randomUUID()
    await persistProduct({
      ...product,
      id: newId,
      name: `${product.name} Copy`,
      slug: `${product.slug}-copy-${newId.slice(0, 8)}`,
      sku: product.sku ? `${product.sku}-COPY` : '',
      published: false,
      created_at: new Date().toISOString(),
    }, 'Product duplicated')
  }

  async function toggleArchive(product) {
    await persistProduct({ ...product, archived: !product.archived, published: product.archived ? product.published : false }, product.archived ? 'Product restored' : 'Product archived')
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Catalog</p>
          <h1>Products</h1>
        </div>
        <button className="admin-button admin-button-dark pressable" onClick={() => setEditingProduct({})}>
          <AdminIcon name="plus" />
          Add product
        </button>
      </header>

      <div className="admin-toolbar">
        <label className="admin-search">
          <AdminIcon name="search" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search products" />
        </label>
        <select value={category} onChange={event => setCategory(event.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map(item => <option key={item.id} value={item.slug || item.id}>{item.name}</option>)}
        </select>
        <select value={stock} onChange={event => setStock(event.target.value)} aria-label="Filter by stock">
          <option value="all">All stock</option>
          <option value="in_stock">In stock</option>
          <option value="low_stock">Low stock</option>
          <option value="out_of_stock">Out of stock</option>
          <option value="preorder">Preorder</option>
        </select>
        <select value={flag} onChange={event => setFlag(event.target.value)} aria-label="Filter by visibility">
          <option value="all">Active</option>
          <option value="featured">Featured</option>
          <option value="new_arrival">New arrivals</option>
          <option value="archived">Archived</option>
        </select>
        <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort products">
          <option value="newest">Newest</option>
          <option value="price">Price</option>
          <option value="name">Name</option>
          <option value="stock">Stock</option>
        </select>
      </div>

      <div className="admin-products-panel" aria-busy={loading}>
        {filteredProducts.length ? (
          <div className="admin-product-table">
            {filteredProducts.map(product => (
              <article key={product.id} className="admin-product-row">
                <img src={product.images[0] || product.fallback_image_url} alt="" width="72" height="72" />
                <div className="admin-product-primary">
                  <strong>{product.name}</strong>
                  <span>{product.category} · {product.sku || 'No SKU'}</span>
                </div>
                <p className="admin-product-meta tabular-nums" data-label="Price">{formatPrice(product.price, product.currency)}</p>
                <p className={`admin-pill admin-pill-${product.stock_status}`} data-label="Status" data-qty={product.stock_quantity}>{product.stock_status.replaceAll('_', ' ')}</p>
                <p className="admin-product-meta tabular-nums" data-label="Qty">{product.stock_quantity}</p>
                <div className="admin-row-actions">
                  <button className="pressable" onClick={() => setEditingProduct(product)} aria-label={`Edit ${product.name}`}><AdminIcon name="edit" /></button>
                  <button className="pressable" onClick={() => duplicateProduct(product)} aria-label={`Duplicate ${product.name}`}><AdminIcon name="copy" /></button>
                  <button className="pressable" onClick={() => toggleArchive(product)} aria-label={`Archive ${product.name}`}><AdminIcon name="archive" /></button>
                  <button className="pressable" onClick={() => setConfirmDelete(product)} aria-label={`Delete ${product.name}`}><AdminIcon name="trash" /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state">
            <span className="admin-empty-icon"><AdminIcon name="box" /></span>
            <h2>No products found.</h2>
            <p>Adjust filters or add the first product.</p>
          </div>
        )}
      </div>

      {editingProduct && (
        <ProductFormPanel
          product={editingProduct.id ? editingProduct : null}
          categories={categories}
          collections={collections}
          onClose={() => setEditingProduct(null)}
          onSave={persistProduct}
        />
      )}

      {confirmDelete && (
        <div className="admin-dialog-backdrop">
          <div className="admin-dialog" role="alertdialog" aria-modal="true" aria-label="Delete product">
            <h2>Delete {confirmDelete.name}?</h2>
            <p>This removes the product record. Supabase media is detached by cascade; local fallback media stays in browser storage.</p>
            <div>
              <ButtonShim variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</ButtonShim>
              <ButtonShim variant="danger" onClick={() => handleDelete(confirmDelete)}>Delete</ButtonShim>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function ButtonShim({ children, variant, onClick }) {
  return <button type="button" className={`admin-button pressable ${variant === 'danger' ? 'admin-button-danger' : ''}`} onClick={onClick}>{children}</button>
}
