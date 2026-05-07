import { Link } from 'react-router-dom'
import { useProducts } from '../../hooks/useProducts'
import { hasSupabaseConfig } from '../../lib/supabase'
import { formatPrice } from '../../utils/formatPrice'

function StatCard({ label, value, note }) {
  return (
    <article className="admin-stat-card">
      <p>{label}</p>
      <strong className="tabular-nums">{value}</strong>
      {note && <span>{note}</span>}
    </article>
  )
}

export default function AdminOverview() {
  const { products, loading } = useProducts({ includeUnpublished: true })
  const activeProducts = products.filter(product => !product.archived)
  const inStock = activeProducts.filter(product => product.stock_quantity > 0)
  const outOfStock = activeProducts.filter(product => product.stock_quantity <= 0)
  const featured = activeProducts.filter(product => product.featured)
  const lowStock = activeProducts.filter(product => product.stock_status === 'low_stock')
  const drafts = activeProducts.filter(product => !product.published)
  const missingModels = activeProducts.filter(product => !product.model_url)
  const modelReady = activeProducts.filter(product => product.model_url && product.model_lite_url && (product.model_poster_url || product.fallback_image_url))
  const recent = [...products].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5)

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Admin</p>
          <h1>Overview</h1>
        </div>
        <Link to="/admin/products" className="admin-button admin-button-dark pressable">Manage products</Link>
      </header>

      <div className="admin-stat-grid" aria-busy={loading}>
        <StatCard label="Total products" value={activeProducts.length} note={`${products.filter(product => product.archived).length} archived`} />
        <StatCard label="In stock" value={inStock.length} note="Available now" />
        <StatCard label="Out of stock" value={outOfStock.length} note="Needs attention" />
        <StatCard label="Featured" value={featured.length} note="Homepage ready" />
      </div>

      <section className="admin-control-panel">
        <div>
          <p className="admin-kicker">Publishing controls</p>
          <h2>Catalog readiness</h2>
        </div>
        <div className="admin-control-grid">
          <Link to="/admin/products" className="admin-control-tile pressable">
            <strong className="tabular-nums">{drafts.length}</strong>
            <span>Draft products</span>
          </Link>
          <Link to="/admin/products" className="admin-control-tile pressable">
            <strong className="tabular-nums">{missingModels.length}</strong>
            <span>Missing 3D models</span>
          </Link>
          <Link to="/admin/products" className="admin-control-tile pressable">
            <strong className="tabular-nums">{modelReady.length}</strong>
            <span>Model-ready products</span>
          </Link>
          <Link to="/admin/taxonomy" className="admin-control-tile pressable">
            <strong>{hasSupabaseConfig ? 'Supabase' : 'Local'}</strong>
            <span>{hasSupabaseConfig ? 'Database connected' : 'Browser fallback'}</span>
          </Link>
        </div>
      </section>

      <div className="admin-overview-grid">
        <section className="admin-panel">
          <div className="admin-panel-header">
            <h2>Recent updates</h2>
            <span>{recent.length}</span>
          </div>
          <div className="admin-list">
            {recent.map(product => (
              <Link key={product.id} to="/admin/products" className="admin-list-row pressable">
                <img src={product.images[0]} alt="" width="56" height="56" />
                <span>
                  <strong>{product.name}</strong>
                  <small>{new Date(product.updated_at).toLocaleDateString()}</small>
                </span>
                <em>{formatPrice(product.price, product.currency)}</em>
              </Link>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <h2>Low stock alerts</h2>
            <span>{lowStock.length}</span>
          </div>
          {lowStock.length ? (
            <div className="admin-list">
              {lowStock.map(product => (
                <Link key={product.id} to="/admin/products" className="admin-list-row pressable">
                  <img src={product.images[0]} alt="" width="56" height="56" />
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.sku || 'No SKU'}</small>
                  </span>
                  <em className="tabular-nums">{product.stock_quantity} left</em>
                </Link>
              ))}
            </div>
          ) : (
            <div className="admin-quiet-state">No low stock products.</div>
          )}
        </section>
      </div>
    </section>
  )
}
