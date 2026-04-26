import { useEffect, useState } from 'react'
import { AdminIcon } from '../../components/admin/AdminIcons'
import { deleteTaxonomy, listCategories, listCollections, saveTaxonomy, slugify } from '../../lib/productStore'
import { useToast } from '../../context/ToastContext'

function TaxonomySection({ type, title, items, onSave, onDelete }) {
  const [draft, setDraft] = useState({ name: '', slug: '', description: '' })

  function edit(item) {
    setDraft(item)
  }

  async function submit(event) {
    event.preventDefault()
    await onSave(type, { ...draft, slug: draft.slug || slugify(draft.name) })
    setDraft({ name: '', slug: '', description: '' })
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <h2>{title}</h2>
        <span>{items.length}</span>
      </div>
      <form className="admin-taxonomy-form" onSubmit={submit}>
        <input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value, slug: draft.id ? draft.slug : slugify(event.target.value) })} placeholder={`${title.slice(0, -1)} name`} required />
        <input value={draft.slug} onChange={event => setDraft({ ...draft, slug: slugify(event.target.value) })} placeholder="slug" required />
        <input value={draft.description || ''} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="short description" />
        <button className="admin-button admin-button-dark pressable" type="submit">{draft.id ? 'Save' : 'Add'}</button>
      </form>
      <div className="admin-taxonomy-list">
        {items.map(item => (
          <article key={item.id}>
            <span>
              <strong>{item.name}</strong>
              <small>{item.slug}</small>
            </span>
            <div>
              <button className="pressable" onClick={() => edit(item)} aria-label={`Edit ${item.name}`}><AdminIcon name="edit" /></button>
              <button className="pressable" onClick={() => onDelete(type, item.id)} aria-label={`Delete ${item.name}`}><AdminIcon name="trash" /></button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function AdminTaxonomyPage() {
  const { addToast } = useToast()
  const [categories, setCategories] = useState([])
  const [collections, setCollections] = useState([])

  async function refresh() {
    const [nextCategories, nextCollections] = await Promise.all([listCategories(), listCollections()])
    setCategories(nextCategories)
    setCollections(nextCollections)
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([listCategories(), listCollections()]).then(([nextCategories, nextCollections]) => {
      if (cancelled) return
      setCategories(nextCategories)
      setCollections(nextCollections)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave(type, values) {
    await saveTaxonomy(type, values)
    await refresh()
    addToast(`${type === 'category' ? 'Category' : 'Collection'} saved`)
  }

  async function handleDelete(type, id) {
    if (!window.confirm(`Delete this ${type}? Products keep their existing assignment value.`)) return
    await deleteTaxonomy(type, id)
    await refresh()
    addToast(`${type === 'category' ? 'Category' : 'Collection'} deleted`)
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Catalog structure</p>
          <h1>Categories & collections</h1>
        </div>
      </header>
      <div className="admin-overview-grid">
        <TaxonomySection type="category" title="Categories" items={categories} onSave={handleSave} onDelete={handleDelete} />
        <TaxonomySection type="collection" title="Collections" items={collections} onSave={handleSave} onDelete={handleDelete} />
      </div>
    </section>
  )
}
