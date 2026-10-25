import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Plus, Save, Trash2 } from 'lucide-react'
import type { StationeryCategory } from '../data/products'

type Props = {
  categories: StationeryCategory[]
  saving: boolean
  onSave: (categories: StationeryCategory[]) => Promise<boolean>
  onDelete: (slug: string) => Promise<boolean>
}

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function StorefrontCategories({ categories, saving, onSave, onDelete }: Props) {
  const [drafts, setDrafts] = useState(categories)
  const [selectedSlug, setSelectedSlug] = useState(categories[0]?.slug || '')
  const [newCategorySlugs, setNewCategorySlugs] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState('')
  const lastServerSnapshot = useRef(JSON.stringify(categories))

  useEffect(() => {
    const incoming = JSON.stringify(categories)
    if (incoming === lastServerSnapshot.current) return
    lastServerSnapshot.current = incoming
    setDrafts(categories)
    if (!selectedSlug && categories[0]) setSelectedSlug(categories[0].slug)
  }, [categories])

  const selected = drafts.find(category => category.slug === selectedSlug)
  const update = (patch: Partial<StationeryCategory>) => {
    if (!selected) return
    const updated = { ...selected, ...patch }
    setDrafts(current => current.map(category => category.slug === selected.slug ? updated : category))
    if (patch.slug) {
      setSelectedSlug(patch.slug)
      setNewCategorySlugs(current => {
        if (!current.has(selected.slug)) return current
        const next = new Set(current)
        next.delete(selected.slug)
        next.add(patch.slug!)
        return next
      })
    }
  }

  const addCategory = () => {
    const base = `new-category-${Date.now().toString().slice(-5)}`
    const next: StationeryCategory = { slug: base, name: 'New category', nameTa: '', icon: '📦', tagline: '', subcategories: [] }
    setDrafts(current => [...current, next])
    setNewCategorySlugs(current => new Set(current).add(base))
    setSelectedSlug(base)
  }

  const handleImage = async (file?: File) => {
    if (!file || !selected) return
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      setError('Choose an image file under 2 MB.')
      return
    }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Image could not be read'))
      reader.onerror = () => reject(new Error('Image could not be read'))
      reader.readAsDataURL(file)
    }).catch(() => '')
    if (!data) return setError('Could not read that image. Try another file.')
    update({ image: data })
    setError('')
  }

  const handleSave = async () => {
    const seen = new Set<string>()
    for (const item of drafts) {
      const slug = slugify(item.slug)
      if (!slug || !item.name.trim() || seen.has(slug)) {
        setError('Each category needs a unique web address and a name.')
        return
      }
      seen.add(slug)
    }
    setError('')
    const saved = await onSave(drafts.map(item => ({ ...item, slug: slugify(item.slug), name: item.name.trim() })))
    if (saved) setNewCategorySlugs(new Set())
  }

  const handleDelete = async () => {
    if (!selected) return
    if (!window.confirm(`Delete the “${selected.name}” storefront category? Products assigned to it will remain in inventory.`)) return
    setError('')
    if (!await onDelete(selected.slug)) return
    const remaining = drafts.filter(category => category.slug !== selected.slug)
    setDrafts(remaining)
    setSelectedSlug(remaining[0]?.slug || '')
  }

  return (
    <section className="admin-category-manager">
      <div className="admin-category-list">
        <div className="admin-category-list-heading">
          <div>
            <strong>Store categories</strong>
            <span>Changes here appear in the storefront navigation and round filters.</span>
          </div>
          <button className="admin-btn admin-btn-secondary" type="button" onClick={addCategory}><Plus size={15} /> Add category</button>
        </div>
        {drafts.map(category => (
          <div key={category.slug} className={`admin-category-row ${selectedSlug === category.slug ? 'active' : ''}`}>
            <button type="button" onClick={() => setSelectedSlug(category.slug)}>
              {category.image ? <img src={category.image} alt="" /> : <span className="admin-category-icon">{category.icon}</span>}
              <span><b>{category.name}</b><small>/{category.slug}</small></span>
            </button>
            <button type="button" className="admin-category-delete" aria-label={`Delete ${category.name}`} title={`Delete ${category.name}`} onClick={() => { if (!window.confirm(`Delete the “${category.name}” storefront category? Products assigned to it will remain in inventory.`)) return; void onDelete(category.slug).then(deleted => { if (deleted) { const remaining = drafts.filter(item => item.slug !== category.slug); setDrafts(remaining); setSelectedSlug(current => current === category.slug ? (remaining[0]?.slug || '') : current) } }) }}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      {selected && (
        <div className="admin-category-editor">
          <div className="admin-category-editor-heading">
            <div><h2>Edit storefront category</h2><p>Update its name, circle image, and subcategory filters.</p></div>
            <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={() => void handleSave()}>
              <Save size={15} /> {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" disabled={saving} onClick={() => void handleDelete()}><Trash2 size={15} /> Delete category</button>
          </div>
          {error && <p className="admin-category-error" role="alert">{error}</p>}
          <div className="admin-category-form-grid">
            <label>Category name<input className="admin-form-input" value={selected.name} onChange={event => update({ name: event.target.value })} /></label>
            <label>URL slug<input className="admin-form-input" value={selected.slug} disabled={!newCategorySlugs.has(selected.slug)} onChange={event => update({ slug: slugify(event.target.value) })} /></label>
            <label>Tamil name<input className="admin-form-input" value={selected.nameTa} onChange={event => update({ nameTa: event.target.value })} /></label>
            <label>Circle icon<input className="admin-form-input" value={selected.icon} maxLength={8} onChange={event => update({ icon: event.target.value || '📦' })} /></label>
            <label className="admin-category-wide">Short description<input className="admin-form-input" value={selected.tagline} onChange={event => update({ tagline: event.target.value })} maxLength={300} /></label>
            <label>Badge text<input className="admin-form-input" value={selected.badge || ''} onChange={event => update({ badge: event.target.value || undefined })} maxLength={80} /></label>
            <label>Category image URL<input className="admin-form-input" value={selected.image || ''} onChange={event => update({ image: event.target.value || undefined })} /></label>
            <label className="admin-category-wide">Upload category image<input type="file" accept="image/*" onChange={event => void handleImage(event.target.files?.[0])} /></label>
            <label className="admin-category-wide">Subcategories, one per line (name | icon)
              <textarea className="admin-form-input" rows={5} value={selected.subcategories.map(sub => `${sub.name} | ${sub.icon}`).join('\n')} onChange={event => update({ subcategories: event.target.value.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
                const [name, icon = '📦'] = line.split('|').map(part => part.trim())
                return { id: slugify(name), name, icon: icon || '📦' }
              }) })} />
            </label>
          </div>
          <div className="admin-category-preview">
            {selected.image ? <img src={selected.image} alt="Category preview" /> : <span>{selected.icon}</span>}
            <div><strong>{selected.name}</strong><small>{selected.tagline || 'Category description preview'}</small></div>
            <ImagePlus size={18} />
          </div>
        </div>
      )}
    </section>
  )
}
