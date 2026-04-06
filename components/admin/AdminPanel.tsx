'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Creator, Product, Campaign, CreatorLevel } from '@/lib/types'
import StrategyManager from '@/components/admin/StrategyManager'
import {
  adminLogout,
  addCreator, updateCreatorGMV, updateCreatorLevel, updateCreatorPersonalGoal, toggleCreatorActive, deleteCreator, updateCreatorEliteSettings,
  addProduct, updateProduct, deleteProduct, toggleProductExclusive, toggleProductInitiation,
  addCampaign, updateCampaignSpots, toggleCampaignStatus, deleteCampaign,
  updateProductRequestStatus,
} from '@/app/admin/actions'

interface ApplicationRow {
  id: string
  posts_offered: number | null
  live_hours_offered: number | null
  price_offered: number | null
  created_at: string
  creator: { name: string | null; email: string } | null
  campaign: { brand_name: string } | null
}

interface ProductRequestRow {
  id: string
  product_name: string
  brand_name: string
  reason: string | null
  status: string
  created_at: string
  creator: { name: string | null; email: string } | null
}

interface InitiationSelectionRow {
  creator_id: string
  product_id: string
  product: { name: string } | null
  creator: { name: string | null; email: string } | null
}

interface AdminPanelProps {
  creators: Creator[]
  products: Product[]
  campaigns: Campaign[]
  applications: ApplicationRow[]
  productRequests: ProductRequestRow[]
  initiationSelections: InitiationSelectionRow[]
}

const LEVELS: CreatorLevel[] = ['Initiation', 'Rising', 'Pro', 'Elite']
const LEVEL_COLORS: Record<CreatorLevel, string> = {
  Initiation: 'bg-gray-100 text-gray-600',
  Rising: 'bg-pink-100 text-pink-700',
  Pro: 'bg-emerald-100 text-emerald-700',
  Elite: 'bg-amber-100 text-amber-700',
}

const DEFAULT_TAGS = ['viral', 'evergreen', 'seasonal', 'trending', 'new']
const TAG_PALETTE: Record<string, string> = {
  viral: 'bg-orange-100 text-orange-700',
  evergreen: 'bg-emerald-100 text-emerald-700',
  seasonal: 'bg-blue-100 text-blue-700',
  trending: 'bg-purple-100 text-purple-700',
  new: 'bg-pink-100 text-pink-700',
}
function tagColor(tag: string): string {
  return TAG_PALETTE[tag] ?? 'bg-gray-100 text-gray-600'
}

function Feedback({ msg }: { msg: string | null }) {
  if (!msg) return null
  const isError = msg.startsWith('Error')
  return (
    <p className={`text-sm font-dm-sans mt-2 px-3 py-2 rounded-lg ${isError ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
      {msg}
    </p>
  )
}

// ── Creators Tab ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CreatorsTab({ creators, products: _products }: { creators: Creator[]; products: Product[] }) {
  const [editingGMV, setEditingGMV] = useState<{ id: string; value: string } | null>(null)
  const [editingGoal, setEditingGoal] = useState<{ id: string; value: string } | null>(null)
  const [expandedElite, setExpandedElite] = useState<string | null>(null)
  const [eliteForm, setEliteForm] = useState<{ whatsapp_number: string; mastermind_date: string; account_manager_name: string; account_manager_whatsapp: string }>({ whatsapp_number: '', mastermind_date: '', account_manager_name: '', account_manager_whatsapp: '' })
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '' })
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openElite(c: Creator) {
    setExpandedElite(c.id)
    setEliteForm({
      whatsapp_number: c.whatsapp_number ?? '',
      mastermind_date: c.mastermind_date ? c.mastermind_date.slice(0, 16) : '',
      account_manager_name: c.account_manager_name ?? '',
      account_manager_whatsapp: c.account_manager_whatsapp ?? '',
    })
  }

  function fb(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 4000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">Creators</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition"
        >
          {showAdd ? 'Cancel' : '+ Invite creator'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-brand-light-pink border border-brand-pink/20 rounded-2xl p-5 mb-5">
          <h3 className="font-dm-sans font-semibold text-sm text-brand-black mb-3">Invite new creator</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              className="input-field"
            />
            <input
              type="email"
              placeholder="Email"
              value={addForm.email}
              onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              className="input-field"
            />
          </div>
          <button
            disabled={isPending || !addForm.email}
            onClick={() => startTransition(async () => {
              const r = await addCreator(addForm.name, addForm.email)
              if (r.error) fb(`Error: ${r.error}`)
              else { fb('✓ Creator invited!'); setAddForm({ name: '', email: '' }); setShowAdd(false) }
            })}
            className="mt-3 font-dm-sans text-sm font-semibold bg-brand-green text-white px-5 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
          >
            {isPending ? 'Sending...' : 'Send invitation'}
          </button>
        </div>
      )}

      <Feedback msg={feedback} />

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm font-dm-sans">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'Email', 'Level', 'GMV', 'Personal Goal', 'Status', 'Actions', 'Elite'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {creators.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No creators yet.</td></tr>
            )}
            {creators.map((c) => (
              <>
              <tr key={c.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-brand-black whitespace-nowrap">{c.name || '–'}</td>
                <td className="px-4 py-3 text-gray-500">{c.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={c.level}
                    disabled={isPending}
                    onChange={(e) => startTransition(async () => {
                      await updateCreatorLevel(c.id, e.target.value as CreatorLevel)
                      fb('✓ Level updated')
                    })}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${LEVEL_COLORS[c.level]}`}
                  >
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {editingGMV?.id === c.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">$</span>
                      <input
                        type="number"
                        value={editingGMV.value}
                        onChange={(e) => setEditingGMV({ id: c.id, value: e.target.value })}
                        className="w-20 px-2 py-1 text-sm border border-brand-pink rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-pink"
                        autoFocus
                      />
                      <button
                        onClick={() => startTransition(async () => {
                          const r = await updateCreatorGMV(c.id, parseFloat(editingGMV.value))
                          if (r.error) fb(`Error: ${r.error}`)
                          else fb('✓ GMV saved')
                          setEditingGMV(null)
                        })}
                        className="text-xs bg-brand-green text-white px-2 py-1 rounded-lg hover:bg-brand-green/90"
                      >✓</button>
                      <button onClick={() => setEditingGMV(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingGMV({ id: c.id, value: String(c.gmv) })}
                      className="font-semibold text-brand-green hover:underline"
                    >
                      ${c.gmv.toLocaleString('en-US')}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingGoal?.id === c.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">$</span>
                      <input
                        type="number"
                        value={editingGoal.value}
                        onChange={(e) => setEditingGoal({ id: c.id, value: e.target.value })}
                        className="w-20 px-2 py-1 text-sm border border-brand-pink rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-pink"
                        autoFocus
                      />
                      <button
                        onClick={() => startTransition(async () => {
                          const r = await updateCreatorPersonalGoal(c.id, parseFloat(editingGoal.value) || 0)
                          if (r.error) fb(`Error: ${r.error}`)
                          else fb('✓ Personal goal saved')
                          setEditingGoal(null)
                        })}
                        className="text-xs bg-brand-green text-white px-2 py-1 rounded-lg hover:bg-brand-green/90"
                      >✓</button>
                      <button onClick={() => setEditingGoal(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingGoal({ id: c.id, value: String(c.personal_gmv_goal ?? 0) })}
                      className="text-brand-black hover:underline hover:text-brand-green"
                    >
                      {c.personal_gmv_goal > 0 ? `$${Number(c.personal_gmv_goal).toLocaleString('en-US')}` : <span className="text-gray-400 text-xs">Set goal</span>}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => {
                        await toggleCreatorActive(c.id, !c.is_active)
                        fb(`✓ Creator ${c.is_active ? 'deactivated' : 'activated'}`)
                      })}
                      className="text-xs text-gray-500 hover:text-brand-green transition px-2 py-1 rounded-lg hover:bg-gray-100"
                    >
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        if (confirm(`Delete "${c.name || c.email}"? This cannot be undone.`)) {
                          startTransition(async () => {
                            const r = await deleteCreator(c.id)
                            if (r.error) fb(`Error: ${r.error}`)
                            else fb('✓ Creator deleted')
                          })
                        }
                      }}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                    >
                      Delete
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => expandedElite === c.id ? setExpandedElite(null) : openElite(c)}
                    className="text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-full transition"
                  >
                    {expandedElite === c.id ? 'Close' : 'Settings'}
                  </button>
                </td>
              </tr>
              {expandedElite === c.id && (
                <tr key={`${c.id}-elite`} className="bg-amber-50/50">
                  <td colSpan={8} className="px-6 py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">WhatsApp (creator)</p>
                        <input
                          placeholder="+1..."
                          value={eliteForm.whatsapp_number}
                          onChange={(e) => setEliteForm((f) => ({ ...f, whatsapp_number: e.target.value }))}
                          className="input-field text-xs"
                        />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Mastermind date</p>
                        <input
                          type="datetime-local"
                          value={eliteForm.mastermind_date}
                          onChange={(e) => setEliteForm((f) => ({ ...f, mastermind_date: e.target.value }))}
                          className="input-field text-xs"
                        />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Account manager name</p>
                        <input
                          placeholder="Name"
                          value={eliteForm.account_manager_name}
                          onChange={(e) => setEliteForm((f) => ({ ...f, account_manager_name: e.target.value }))}
                          className="input-field text-xs"
                        />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Manager WhatsApp</p>
                        <input
                          placeholder="+1..."
                          value={eliteForm.account_manager_whatsapp}
                          onChange={(e) => setEliteForm((f) => ({ ...f, account_manager_whatsapp: e.target.value }))}
                          className="input-field text-xs"
                        />
                      </div>
                    </div>
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => {
                        const r = await updateCreatorEliteSettings(c.id, {
                          whatsapp_number: eliteForm.whatsapp_number || null,
                          mastermind_date: eliteForm.mastermind_date || null,
                          account_manager_name: eliteForm.account_manager_name || null,
                          account_manager_whatsapp: eliteForm.account_manager_whatsapp || null,
                        })
                        if (r.error) fb(`Error: ${r.error}`)
                        else { fb('✓ Settings saved'); setExpandedElite(null) }
                      })}
                      className="font-dm-sans text-xs font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
                    >
                      {isPending ? 'Saving...' : 'Save settings'}
                    </button>
                  </td>
                </tr>
              )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Products Tab ──────────────────────────────────────────────────────────────
function ProductsTab({ products }: { products: Product[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [availableTags, setAvailableTags] = useState<string[]>(DEFAULT_TAGS)
  const [newTag, setNewTag] = useState('')
  const [form, setForm] = useState({
    name: '', commission_rate: '', conversion_rate: '', niche: '',
    is_exclusive: false, image_url: '', product_link: '', tags: [] as string[],
  })
  const [editForm, setEditForm] = useState<Partial<{
    name: string; commission_rate: number; conversion_rate: number
    niche: string; is_exclusive: boolean; image_url: string | null; product_link: string | null; tags: string[]
  }>>({})
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function fb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 4000) }

  function toggleTag(tag: string, current: string[], setter: (tags: string[]) => void) {
    setter(current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag])
  }

  function addCustomTag() {
    const t = newTag.trim().toLowerCase()
    if (t && !availableTags.includes(t)) {
      setAvailableTags((prev) => [...prev, t])
      setNewTag('')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">Products</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition">
          {showAdd ? 'Cancel' : '+ Add product'}
        </button>
      </div>

      {/* Manage Tags */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-5">
        <h3 className="font-dm-sans font-semibold text-sm text-brand-black mb-2">Manage tags</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {availableTags.map((tag) => (
            <span key={tag} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${tagColor(tag)}`}>
              {tag}
              {!DEFAULT_TAGS.includes(tag) && (
                <button
                  onClick={() => setAvailableTags((t) => t.filter((x) => x !== tag))}
                  className="opacity-60 hover:opacity-100 ml-0.5 leading-none"
                  aria-label={`Remove ${tag}`}
                >×</button>
              )}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add new tag…"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
            className="input-field flex-1 max-w-xs"
          />
          <button
            onClick={addCustomTag}
            className="font-dm-sans text-sm font-semibold bg-brand-black text-white px-4 py-2 rounded-xl hover:bg-brand-black/80 transition"
          >
            + Add
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-brand-light-pink border border-brand-pink/20 rounded-2xl p-5 mb-5">
          <h3 className="font-dm-sans font-semibold text-sm mb-3 text-brand-black">New product</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field col-span-2 sm:col-span-1" />
            <input placeholder="Commission %" type="number" value={form.commission_rate} onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))} className="input-field" />
            <input placeholder="Conversion %" type="number" value={form.conversion_rate} onChange={(e) => setForm((f) => ({ ...f, conversion_rate: e.target.value }))} className="input-field" />
            <input placeholder="Niche (e.g. Beauty)" value={form.niche} onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))} className="input-field" />
            <input placeholder="Image URL" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} className="input-field" />
            <input placeholder="Product link" value={form.product_link} onChange={(e) => setForm((f) => ({ ...f, product_link: e.target.value }))} className="input-field" />
            <label className="flex items-center gap-2 font-dm-sans text-sm text-gray-700">
              <input type="checkbox" checked={form.is_exclusive} onChange={(e) => setForm((f) => ({ ...f, is_exclusive: e.target.checked }))} className="rounded" />
              Exclusive
            </label>
          </div>
          {form.image_url && (
            <div className="mt-3">
              <p className="font-dm-sans text-xs text-gray-400 mb-1">Preview:</p>
              <img src={form.image_url} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
          <div className="mt-3">
            <p className="font-dm-sans text-xs font-medium text-gray-600 mb-2">Tags:</p>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag, form.tags, (tags) => setForm((f) => ({ ...f, tags })))}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border transition ${form.tags.includes(tag) ? `${tagColor(tag)} border-current` : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <button
            disabled={isPending || !form.name}
            onClick={() => startTransition(async () => {
              const r = await addProduct({
                name: form.name,
                commission_rate: parseFloat(form.commission_rate) || 0,
                conversion_rate: parseFloat(form.conversion_rate) || 0,
                is_exclusive: form.is_exclusive,
                niche: form.niche,
                image_url: form.image_url || null,
                product_link: form.product_link || null,
                tags: form.tags,
              })
              if (r.error) fb(`Error: ${r.error}`)
              else {
                fb('✓ Product added')
                setForm({ name: '', commission_rate: '', conversion_rate: '', niche: '', is_exclusive: false, image_url: '', product_link: '', tags: [] })
                setShowAdd(false)
              }
            })}
            className="mt-4 font-dm-sans text-sm font-semibold bg-brand-green text-white px-5 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      <Feedback msg={feedback} />

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm font-dm-sans">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Image', 'Name', 'Commission', 'Niche', 'Tags', 'Exclusive', 'Initiation', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No products yet.</td></tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-gray-100" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-xs">–</div>
                  }
                </td>
                <td className="px-4 py-3 font-medium text-brand-black">
                  {editingId === p.id
                    ? <input defaultValue={p.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="input-field w-36" />
                    : <div>
                        <p>{p.name}</p>
                        {p.product_link && (
                          <a href={p.product_link} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-green hover:underline">Link →</a>
                        )}
                      </div>
                  }
                </td>
                <td className="px-4 py-3 font-bold text-brand-pink">{p.commission_rate}%</td>
                <td className="px-4 py-3">
                  {p.niche && <span className="bg-brand-light-pink text-brand-green text-xs font-medium px-2 py-0.5 rounded-full">{p.niche}</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(p.tags ?? []).map((tag) => (
                      <span key={tag} className={`text-xs font-medium px-2 py-0.5 rounded-full ${tagColor(tag)}`}>{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(async () => { await toggleProductExclusive(p.id, !p.is_exclusive); fb('✓ Saved') })}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition ${p.is_exclusive ? 'bg-brand-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {p.is_exclusive ? 'Exclusive ✓' : 'Standard'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(async () => { await toggleProductInitiation(p.id, !p.approved_for_initiation); fb('✓ Saved') })}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition ${p.approved_for_initiation ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {p.approved_for_initiation ? '✓ Approved' : 'Off'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {editingId === p.id ? (
                      <>
                        <button
                          disabled={isPending}
                          onClick={() => startTransition(async () => {
                            if (Object.keys(editForm).length > 0) await updateProduct(p.id, editForm)
                            fb('✓ Updated'); setEditingId(null); setEditForm({})
                          })}
                          className="text-xs bg-brand-green text-white px-2.5 py-1 rounded-lg"
                        >Save</button>
                        <button onClick={() => { setEditingId(null); setEditForm({}) }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditingId(p.id)} className="text-xs text-gray-500 hover:text-brand-green px-2 py-1 rounded-lg hover:bg-gray-100 transition">Edit</button>
                        <button
                          disabled={isPending}
                          onClick={() => { if (confirm(`Delete "${p.name}"?`)) startTransition(async () => { await deleteProduct(p.id); fb('✓ Deleted') }) }}
                          className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                        >Delete</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Campaigns Tab ─────────────────────────────────────────────────────────────
function CampaignsTab({ campaigns, products }: { campaigns: Campaign[]; products: Product[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingSpots, setEditingSpots] = useState<{ id: string; value: string } | null>(null)
  const [form, setForm] = useState({
    brand_name: '', description: '', commission_rate: '', spots_left: '',
    deadline: '', min_level: 'Initiation' as CreatorLevel, status: 'active',
    brand_logo_url: '', product_id: '', budget: '', product_link: '', sample_available: false,
  })
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function fb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 4000) }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">Campaigns</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition">
          {showAdd ? 'Cancel' : '+ Add campaign'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-brand-light-pink border border-brand-pink/20 rounded-2xl p-5 mb-5">
          <h3 className="font-dm-sans font-semibold text-sm mb-3 text-brand-black">New campaign</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Brand name" value={form.brand_name} onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))} className="input-field" />
            <input placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input-field" />
            <input placeholder="Commission %" type="number" value={form.commission_rate} onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))} className="input-field" />
            <input placeholder="Spots available" type="number" value={form.spots_left} onChange={(e) => setForm((f) => ({ ...f, spots_left: e.target.value }))} className="input-field" />
            <input placeholder="Deadline" type="datetime-local" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} className="input-field" />
            <select value={form.min_level} onChange={(e) => setForm((f) => ({ ...f, min_level: e.target.value as CreatorLevel }))} className="input-field">
              {LEVELS.map((l) => <option key={l} value={l}>from {l}</option>)}
            </select>
            <input placeholder="Brand logo URL" value={form.brand_logo_url} onChange={(e) => setForm((f) => ({ ...f, brand_logo_url: e.target.value }))} className="input-field" />
            <select value={form.product_id} onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))} className="input-field">
              <option value="">Link product (optional)</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Budget ($)" type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} className="input-field" />
            <input placeholder="Product link (showcase)" value={form.product_link} onChange={(e) => setForm((f) => ({ ...f, product_link: e.target.value }))} className="input-field" />
            <label className="flex items-center gap-2 font-dm-sans text-sm text-gray-700 sm:col-span-2">
              <input type="checkbox" checked={form.sample_available} onChange={(e) => setForm((f) => ({ ...f, sample_available: e.target.checked }))} className="rounded" />
              Sample available
            </label>
          </div>
          {form.brand_logo_url && (
            <div className="mt-3">
              <p className="font-dm-sans text-xs text-gray-400 mb-1">Logo preview:</p>
              <img src={form.brand_logo_url} alt="Logo" className="h-10 object-contain rounded border border-gray-200 bg-white px-2 py-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
          <button
            disabled={isPending || !form.brand_name}
            onClick={() => startTransition(async () => {
              const r = await addCampaign({
                brand_name: form.brand_name,
                description: form.description,
                commission_rate: parseFloat(form.commission_rate) || 0,
                spots_left: parseInt(form.spots_left) || 0,
                deadline: form.deadline,
                min_level: form.min_level,
                status: 'active',
                brand_logo_url: form.brand_logo_url || null,
                product_id: form.product_id || null,
                budget: parseFloat(form.budget) || null,
                product_link: form.product_link || null,
                sample_available: form.sample_available,
              })
              if (r.error) fb(`Error: ${r.error}`)
              else {
                fb('✓ Campaign created')
                setForm({ brand_name: '', description: '', commission_rate: '', spots_left: '', deadline: '', min_level: 'Initiation', status: 'active', brand_logo_url: '', product_id: '', budget: '', product_link: '', sample_available: false })
                setShowAdd(false)
              }
            })}
            className="mt-3 font-dm-sans text-sm font-semibold bg-brand-green text-white px-5 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Launch campaign'}
          </button>
        </div>
      )}

      <Feedback msg={feedback} />

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm font-dm-sans">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Logo', 'Brand', 'Commission', 'Spots', 'Budget', 'Deadline', 'Min Level', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {campaigns.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No campaigns yet.</td></tr>
            )}
            {campaigns.map((c) => (
              <tr key={c.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  {c.brand_logo_url
                    ? <img src={c.brand_logo_url} alt={c.brand_name} className="h-8 w-12 object-contain rounded border border-gray-100 bg-white p-0.5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <div className="h-8 w-12 rounded bg-gray-100 flex items-center justify-center text-gray-300 text-xs">–</div>
                  }
                </td>
                <td className="px-4 py-3 font-medium text-brand-black whitespace-nowrap">
                  <Link href={`/campaigns/${c.id}`} className="hover:text-brand-green hover:underline">{c.brand_name}</Link>
                </td>
                <td className="px-4 py-3 font-bold text-brand-pink">{c.commission_rate}%</td>
                <td className="px-4 py-3">
                  {editingSpots?.id === c.id ? (
                    <div className="flex items-center gap-1.5">
                      <input type="number" value={editingSpots.value} onChange={(e) => setEditingSpots({ id: c.id, value: e.target.value })} className="w-16 px-2 py-1 text-sm border border-brand-pink rounded-lg focus:outline-none" autoFocus />
                      <button onClick={() => startTransition(async () => { await updateCampaignSpots(c.id, parseInt(editingSpots.value)); fb('✓ Spots updated'); setEditingSpots(null) })} className="text-xs bg-brand-green text-white px-2 py-1 rounded-lg">✓</button>
                      <button onClick={() => setEditingSpots(null)} className="text-xs text-gray-400">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingSpots({ id: c.id, value: String(c.spots_left ?? 0) })} className={`font-semibold hover:underline ${(c.spots_left ?? 0) <= 3 ? 'text-orange-600' : 'text-gray-700'}`}>
                      {c.spots_left ?? '–'}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {c.budget ? `$${c.budget.toLocaleString('en-US')}` : '–'}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                  {c.deadline ? new Date(c.deadline).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_COLORS[c.min_level] || 'bg-gray-100 text-gray-600'}`}>
                    from {c.min_level}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                      {c.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                    {c.sample_available && (
                      <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Sample</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await toggleCampaignStatus(c.id, c.status); fb(`✓ Campaign ${c.status === 'active' ? 'deactivated' : 'activated'}`) })}
                      className="text-xs text-gray-500 hover:text-brand-green px-2 py-1 rounded-lg hover:bg-gray-100 transition"
                    >
                      {c.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        if (confirm(`Delete campaign "${c.brand_name}"?`)) {
                          startTransition(async () => { await deleteCampaign(c.id); fb('✓ Campaign deleted') })
                        }
                      }}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Applications Tab ──────────────────────────────────────────────────────────
function ApplicationsTab({ applications }: { applications: ApplicationRow[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">Campaign Applications</h2>
        <span className="font-dm-sans text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          {applications.length} total
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm font-dm-sans">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Creator', 'Campaign', 'Posts', 'Live hours', 'Offer ($)', 'Date'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {applications.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No applications yet.</td></tr>
            )}
            {applications.map((a) => (
              <tr key={a.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-brand-black whitespace-nowrap">
                  {a.creator?.name || a.creator?.email || '–'}
                  {a.creator?.email && a.creator?.name && (
                    <p className="text-xs text-gray-400 font-normal">{a.creator.email}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{a.campaign?.brand_name || '–'}</td>
                <td className="px-4 py-3 text-center"><span className="font-semibold text-brand-black">{a.posts_offered ?? '–'}</span></td>
                <td className="px-4 py-3 text-center"><span className="font-semibold text-brand-black">{a.live_hours_offered ?? '–'}h</span></td>
                <td className="px-4 py-3">
                  <span className="font-bold text-brand-green">
                    {a.price_offered != null ? `$${Number(a.price_offered).toLocaleString('en-US')}` : '–'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {new Date(a.created_at).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Product Requests Tab ──────────────────────────────────────────────────────
function RequestsTab({ productRequests }: { productRequests: ProductRequestRow[] }) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  function fb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 4000) }

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    contacted: 'bg-blue-50 text-blue-700',
    done: 'bg-emerald-50 text-emerald-700',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">Product Requests</h2>
        <span className="font-dm-sans text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          {productRequests.length} total
        </span>
      </div>

      <Feedback msg={feedback} />

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm font-dm-sans">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Creator', 'Product', 'Brand', 'Reason', 'Date', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {productRequests.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No product requests yet.</td></tr>
            )}
            {productRequests.map((r) => (
              <tr key={r.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-brand-black whitespace-nowrap">
                  {r.creator?.name || r.creator?.email || '–'}
                  {r.creator?.email && r.creator?.name && (
                    <p className="text-xs text-gray-400 font-normal">{r.creator.email}</p>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-brand-black">{r.product_name}</td>
                <td className="px-4 py-3 text-gray-600">{r.brand_name}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs">
                  <p className="truncate">{r.reason || '–'}</p>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {new Date(r.created_at).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={r.status}
                    disabled={isPending}
                    onChange={(e) => startTransition(async () => {
                      await updateProductRequestStatus(r.id, e.target.value)
                      fb('✓ Status updated')
                    })}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="contacted">Contacted</option>
                    <option value="done">Done</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab() {
  const [copied, setCopied] = useState(false)
  const hackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/hack`
    : '/hack'

  function copyHackUrl() {
    navigator.clipboard.writeText(hackUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-dm-sans font-bold text-lg text-brand-black mb-4">General Settings</h2>

        <div className="bg-brand-light-pink border border-brand-pink/20 rounded-2xl p-5">
          <h3 className="font-dm-sans font-semibold text-sm text-brand-black mb-1">Hack Portal URL</h3>
          <p className="font-dm-sans text-xs text-gray-500 mb-3">
            Share this public link to give free preview access to potential creators.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-700 truncate">
              {hackUrl}
            </code>
            <button
              onClick={copyHackUrl}
              className="font-dm-sans text-sm font-semibold bg-brand-black text-white px-4 py-2.5 rounded-xl hover:bg-brand-black/80 transition shrink-0"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <a
            href="/hack"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 font-dm-sans text-xs text-brand-green hover:underline"
          >
            Open Hack Portal →
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Initiation Selections Tab ──────────────────────────────────────────────────
function InitiationTab({ selections }: { selections: InitiationSelectionRow[] }) {
  const grouped = selections.reduce<Record<string, InitiationSelectionRow[]>>((acc, s) => {
    const key = s.creator?.email ?? s.creator_id
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">Initiation Product Selections</h2>
        <span className="font-dm-sans text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          {Object.keys(grouped).length} creators
        </span>
      </div>
      {Object.keys(grouped).length === 0 ? (
        <p className="font-dm-sans text-sm text-gray-400 py-8 text-center">No selections yet.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([email, rows]) => (
            <div key={email} className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
              <p className="font-dm-sans font-semibold text-sm text-brand-black mb-2">
                {rows[0]?.creator?.name || email}
                <span className="font-normal text-gray-400 ml-2 text-xs">{email}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {rows.map((r) => (
                  <span key={r.product_id} className="font-dm-sans text-xs font-medium bg-brand-light-pink text-brand-green px-3 py-1 rounded-full border border-brand-pink/20">
                    {r.product?.name ?? r.product_id}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Admin Panel ──────────────────────────────────────────────────────────
type Tab = 'creators' | 'products' | 'campaigns' | 'applications' | 'requests' | 'initiation' | 'strategy' | 'settings'

export default function AdminPanel({ creators, products, campaigns, applications, productRequests, initiationSelections }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('creators')
  const [isPending, startTransition] = useTransition()

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'creators', label: 'Creators', count: creators.length },
    { id: 'products', label: 'Products', count: products.length },
    { id: 'campaigns', label: 'Campaigns', count: campaigns.length },
    { id: 'applications', label: 'Applications', count: applications.length },
    { id: 'requests', label: 'Requests', count: productRequests.filter((r) => r.status === 'pending').length },
    { id: 'initiation', label: 'Initiation', count: initiationSelections.filter((s, i, arr) => arr.findIndex((x) => x.creator_id === s.creator_id) === i).length },
    { id: 'strategy', label: 'Strategy' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Header */}
      <div className="bg-brand-black border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image
                src="https://cgimvsmnfmpzpkakiguo.supabase.co/storage/v1/object/public/PSC%20LOGOS/Long_green.png"
                alt="Papaya Social Club"
                width={120}
                height={32}
              />
              <p className="font-playfair text-lg text-white leading-none">Admin Panel</p>
            </div>
            <div className="flex items-center gap-3">
              <a href="/" className="font-dm-sans text-sm text-white/40 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5">
                ← View app
              </a>
              <button
                disabled={isPending}
                onClick={() => startTransition(async () => { await adminLogout() })}
                className="font-dm-sans text-sm font-semibold text-brand-black bg-brand-pink hover:bg-brand-pink/90 px-4 py-2 rounded-xl transition disabled:opacity-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-brand-black border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 font-dm-sans text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-pink text-white'
                    : 'border-transparent text-white/40 hover:text-white/70'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeTab === tab.id ? 'bg-brand-pink text-brand-black' : 'bg-white/10 text-white/40'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          {activeTab === 'creators' && <CreatorsTab creators={creators} products={products} />}
          {activeTab === 'products' && <ProductsTab products={products} />}
          {activeTab === 'campaigns' && <CampaignsTab campaigns={campaigns} products={products} />}
          {activeTab === 'applications' && <ApplicationsTab applications={applications} />}
          {activeTab === 'requests' && <RequestsTab productRequests={productRequests} />}
          {activeTab === 'initiation' && <InitiationTab selections={initiationSelections} />}
          {activeTab === 'strategy' && <StrategyManager creators={creators} products={products} campaigns={campaigns} />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  )
}
