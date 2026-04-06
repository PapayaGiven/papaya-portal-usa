'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Creator, Product, Campaign, CreatorLevel } from '@/lib/types'
import StrategyManager from '@/components/admin/StrategyManager'
import {
  adminLogout,
  addCreator, updateCreatorGMV, updateCreatorLevel, updateCreatorPersonalGoal, toggleCreatorActive, deleteCreator, updateCreatorEliteSettings, resendInvite,
  addProduct, updateProduct, deleteProduct, toggleProductExclusive, toggleProductInitiation,
  addCampaign, updateCampaign, updateCampaignSpots, toggleCampaignStatus, deleteCampaign,
  updateProductRequestStatus,
  updateLevel, seedDefaultLevels, addReward, updateReward, deleteReward, confirmRewardReceived,
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
  contact_info: string | null
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

interface LevelRow {
  id: string
  name: string
  order_index: number
  gmv_min: number
  gmv_max: number | null
  description: string | null
  includes: string[]
  excludes: string[]
  updated_at: string
}

interface RewardRow {
  id: string
  level_name: string
  title: string
  description: string | null
  emoji: string | null
  cta_text: string | null
  cta_type: string
  cta_url: string | null
  requires_address: boolean
  order_index: number
  is_active: boolean
}

interface CreatorRewardRow {
  id: string
  creator_id: string
  reward_id: string
  claimed_at: string
  received_at: string | null
  shipping_name: string | null
  shipping_phone: string | null
  shipping_address: string | null
  admin_confirmed: boolean
  creator: { name: string | null; email: string } | null
  reward: { title: string; level_name: string } | null
}

interface AdminPanelProps {
  creators: Creator[]
  products: Product[]
  campaigns: Campaign[]
  applications: ApplicationRow[]
  productRequests: ProductRequestRow[]
  initiationSelections: InitiationSelectionRow[]
  levels: LevelRow[]
  rewards: RewardRow[]
  creatorRewards: CreatorRewardRow[]
}

const LEVELS: CreatorLevel[] = ['Initiation', 'Foundation', 'Growth', 'Scale', 'Elite']
const LEVEL_COLORS: Record<CreatorLevel, string> = {
  Initiation: 'bg-gray-100 text-gray-600',
  Foundation: 'bg-pink-100 text-pink-700',
  Growth: 'bg-emerald-100 text-emerald-700',
  Scale: 'bg-purple-100 text-purple-700',
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
                      onClick={() => startTransition(async () => {
                        const r = await resendInvite(c.email)
                        if (r.error) fb(`Error: ${r.error}`)
                        else fb('✓ Invite sent!')
                      })}
                      className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition"
                    >
                      Resend invite
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
              <>
              <tr key={p.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-gray-100" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-xs">–</div>
                  }
                </td>
                <td className="px-4 py-3 font-medium text-brand-black">
                  <div>
                    <p>{p.name}</p>
                    {p.product_link && (
                      <a href={p.product_link} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-green hover:underline">Link →</a>
                    )}
                  </div>
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
                    <button onClick={() => {
                      if (editingId === p.id) { setEditingId(null); setEditForm({}) }
                      else {
                        setEditingId(p.id)
                        setEditForm({
                          name: p.name,
                          commission_rate: p.commission_rate ?? 0,
                          conversion_rate: p.conversion_rate ?? 0,
                          niche: p.niche ?? '',
                          is_exclusive: p.is_exclusive,
                          image_url: p.image_url ?? '',
                          product_link: p.product_link ?? '',
                          tags: p.tags ?? [],
                        })
                      }
                    }} className="text-xs text-gray-500 hover:text-brand-green px-2 py-1 rounded-lg hover:bg-gray-100 transition">
                      {editingId === p.id ? 'Cancel' : 'Edit'}
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => { if (confirm(`Delete "${p.name}"?`)) startTransition(async () => { await deleteProduct(p.id); fb('✓ Deleted') }) }}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                    >Delete</button>
                  </div>
                </td>
              </tr>
              {editingId === p.id && (
                <tr key={`${p.id}-edit`} className="bg-brand-light-pink/50">
                  <td colSpan={8} className="px-6 py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Name</p>
                        <input value={editForm.name ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="input-field w-full" />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Commission %</p>
                        <input type="number" value={editForm.commission_rate ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, commission_rate: parseFloat(e.target.value) || 0 }))} className="input-field w-full" />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Conversion %</p>
                        <input type="number" value={editForm.conversion_rate ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, conversion_rate: parseFloat(e.target.value) || 0 }))} className="input-field w-full" />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Niche</p>
                        <input value={editForm.niche ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, niche: e.target.value }))} className="input-field w-full" />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Image URL</p>
                        <input value={editForm.image_url ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, image_url: e.target.value }))} className="input-field w-full" />
                        {editForm.image_url && (
                          <img src={editForm.image_url as string} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-gray-200 mt-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        )}
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Product Link</p>
                        <div className="flex gap-1">
                          <input value={editForm.product_link ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, product_link: e.target.value }))} className="input-field w-full" />
                          {editForm.product_link && (
                            <a href={editForm.product_link as string} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 px-2 py-1 rounded-lg whitespace-nowrap self-center transition">Test link</a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="font-dm-sans text-xs font-medium text-gray-600 mb-2">Tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag, (editForm.tags as string[]) ?? [], (tags) => setEditForm((f) => ({ ...f, tags })))}
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition ${((editForm.tags as string[]) ?? []).includes(tag) ? `${tagColor(tag)} border-current` : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => {
                        const payload = { ...editForm, image_url: (editForm.image_url as string) || null, product_link: (editForm.product_link as string) || null }
                        await updateProduct(p.id, payload)
                        fb('✓ Updated'); setEditingId(null); setEditForm({})
                      })}
                      className="mt-3 font-dm-sans text-xs font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
                    >
                      {isPending ? 'Saving...' : 'Save changes'}
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

// ── Campaigns Tab ─────────────────────────────────────────────────────────────
function CampaignsTab({ campaigns, products }: { campaigns: Campaign[]; products: Product[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingSpots, setEditingSpots] = useState<{ id: string; value: string } | null>(null)
  const emptyForm = {
    brand_name: '', description: '', commission_rate: '', spots_left: '',
    deadline: '', min_level: 'Initiation' as CreatorLevel, target_levels: [] as string[], status: 'active',
    brand_logo_url: '', product_id: '', budget: '', product_link: '', sample_available: false,
  }
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
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
            <div className="input-field flex flex-wrap items-center gap-2 !py-2">
              <span className="text-xs text-gray-500 font-semibold mr-1">Levels:</span>
              {LEVELS.map((l) => (
                <label key={l} className="flex items-center gap-1 text-xs font-dm-sans text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.target_levels.includes(l)}
                    onChange={(e) => setForm((f) => ({
                      ...f,
                      target_levels: e.target.checked
                        ? [...f.target_levels, l]
                        : f.target_levels.filter((v) => v !== l),
                    }))}
                    className="rounded"
                  />
                  {l}
                </label>
              ))}
            </div>
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
                min_level: form.target_levels.length > 0 ? form.target_levels[0] as CreatorLevel : 'Initiation',
                target_levels: form.target_levels,
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
                setForm({ brand_name: '', description: '', commission_rate: '', spots_left: '', deadline: '', min_level: 'Initiation', target_levels: [], status: 'active', brand_logo_url: '', product_id: '', budget: '', product_link: '', sample_available: false })
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
              {['Logo', 'Brand', 'Commission', 'Spots', 'Budget', 'Deadline', 'Levels', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {campaigns.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No campaigns yet.</td></tr>
            )}
            {campaigns.map((c) => (
              <>
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
                  {c.target_levels && c.target_levels.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {c.target_levels.map((lvl) => (
                        <span key={lvl} className={`text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_COLORS[lvl as CreatorLevel] || 'bg-gray-100 text-gray-600'}`}>
                          {lvl}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_COLORS[c.min_level] || 'bg-gray-100 text-gray-600'}`}>
                      from {c.min_level}
                    </span>
                  )}
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
                      onClick={() => {
                        if (editingId === c.id) { setEditingId(null) }
                        else {
                          setEditingId(c.id)
                          setEditForm({
                            brand_name: c.brand_name,
                            description: c.description ?? '',
                            commission_rate: String(c.commission_rate ?? ''),
                            spots_left: String(c.spots_left ?? ''),
                            deadline: c.deadline ? c.deadline.slice(0, 16) : '',
                            min_level: c.min_level,
                            target_levels: c.target_levels ?? [],
                            status: c.status,
                            brand_logo_url: c.brand_logo_url ?? '',
                            product_id: c.product_id ?? '',
                            budget: c.budget ? String(c.budget) : '',
                            product_link: c.product_link ?? '',
                            sample_available: c.sample_available,
                          })
                        }
                      }}
                      className="text-xs text-gray-500 hover:text-brand-green px-2 py-1 rounded-lg hover:bg-gray-100 transition"
                    >
                      {editingId === c.id ? 'Cancel' : 'Edit'}
                    </button>
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
              {editingId === c.id && (
                <tr key={`${c.id}-edit`} className="bg-brand-light-pink/50">
                  <td colSpan={9} className="px-6 py-4">
                    <h4 className="font-dm-sans font-semibold text-sm text-brand-black mb-3">Edit campaign</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Brand name</p>
                        <input value={editForm.brand_name} onChange={(e) => setEditForm((f) => ({ ...f, brand_name: e.target.value }))} className="input-field w-full" />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Description</p>
                        <input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="input-field w-full" />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Commission %</p>
                        <input type="number" value={editForm.commission_rate} onChange={(e) => setEditForm((f) => ({ ...f, commission_rate: e.target.value }))} className="input-field w-full" />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Spots left</p>
                        <input type="number" value={editForm.spots_left} onChange={(e) => setEditForm((f) => ({ ...f, spots_left: e.target.value }))} className="input-field w-full" />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Deadline</p>
                        <input type="datetime-local" value={editForm.deadline} onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))} className="input-field w-full" />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Target levels</p>
                        <div className="input-field w-full flex flex-wrap items-center gap-2 !py-2">
                          {LEVELS.map((l) => (
                            <label key={l} className="flex items-center gap-1 text-xs font-dm-sans text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editForm.target_levels.includes(l)}
                                onChange={(e) => setEditForm((f) => ({
                                  ...f,
                                  target_levels: e.target.checked
                                    ? [...f.target_levels, l]
                                    : f.target_levels.filter((v) => v !== l),
                                }))}
                                className="rounded"
                              />
                              {l}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Status</p>
                        <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className="input-field w-full">
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Brand Logo URL</p>
                        <input value={editForm.brand_logo_url} onChange={(e) => setEditForm((f) => ({ ...f, brand_logo_url: e.target.value }))} className="input-field w-full" />
                        {editForm.brand_logo_url && (
                          <img src={editForm.brand_logo_url} alt="Logo" className="h-8 object-contain rounded border border-gray-200 bg-white px-2 py-0.5 mt-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        )}
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Linked product</p>
                        <select value={editForm.product_id} onChange={(e) => setEditForm((f) => ({ ...f, product_id: e.target.value }))} className="input-field w-full">
                          <option value="">None</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Budget ($)</p>
                        <input type="number" value={editForm.budget} onChange={(e) => setEditForm((f) => ({ ...f, budget: e.target.value }))} className="input-field w-full" />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Product link</p>
                        <div className="flex gap-1">
                          <input value={editForm.product_link} onChange={(e) => setEditForm((f) => ({ ...f, product_link: e.target.value }))} className="input-field w-full" />
                          {editForm.product_link && (
                            <a href={editForm.product_link} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 px-2 py-1 rounded-lg whitespace-nowrap self-center transition">Test</a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 font-dm-sans text-sm text-gray-700">
                          <input type="checkbox" checked={editForm.sample_available} onChange={(e) => setEditForm((f) => ({ ...f, sample_available: e.target.checked }))} className="rounded" />
                          Sample available
                        </label>
                      </div>
                    </div>
                    <button
                      disabled={isPending || !editForm.brand_name}
                      onClick={() => startTransition(async () => {
                        const r = await updateCampaign(c.id, {
                          brand_name: editForm.brand_name,
                          description: editForm.description,
                          commission_rate: parseFloat(editForm.commission_rate) || 0,
                          spots_left: parseInt(editForm.spots_left) || 0,
                          deadline: editForm.deadline,
                          min_level: editForm.target_levels.length > 0 ? editForm.target_levels[0] as CreatorLevel : editForm.min_level,
                          target_levels: editForm.target_levels,
                          status: editForm.status,
                          brand_logo_url: editForm.brand_logo_url || null,
                          product_id: editForm.product_id || null,
                          budget: parseFloat(editForm.budget) || null,
                          product_link: editForm.product_link || null,
                          sample_available: editForm.sample_available,
                        })
                        if (r.error) fb(`Error: ${r.error}`)
                        else { fb('✓ Campaign updated'); setEditingId(null) }
                      })}
                      className="mt-3 font-dm-sans text-xs font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
                    >
                      {isPending ? 'Saving...' : 'Save changes'}
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
              {['Creator', 'Product', 'Brand', 'Reason', 'Contact', 'Date', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {productRequests.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No product requests yet.</td></tr>
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
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {r.contact_info || '–'}
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

// ── Levels Tab ──────────────────────────────────────────────────────────────
function LevelsTab({ levels }: { levels: LevelRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{
    name: string; gmv_min: string; gmv_max: string; description: string; includes: string; excludes: string
  }>({ name: '', gmv_min: '0', gmv_max: '', description: '', includes: '', excludes: '' })
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function fb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 4000) }

  function startEdit(level: LevelRow) {
    setEditingId(level.id)
    setForm({
      name: level.name,
      gmv_min: String(level.gmv_min),
      gmv_max: level.gmv_max !== null ? String(level.gmv_max) : '',
      description: level.description ?? '',
      includes: (level.includes ?? []).join('\n'),
      excludes: (level.excludes ?? []).join('\n'),
    })
  }

  function handleSave(id: string) {
    startTransition(async () => {
      const res = await updateLevel(id, {
        name: form.name,
        gmv_min: Number(form.gmv_min),
        gmv_max: form.gmv_max ? Number(form.gmv_max) : null,
        description: form.description || undefined,
        includes: form.includes.split('\n').map(s => s.trim()).filter(Boolean),
        excludes: form.excludes.split('\n').map(s => s.trim()).filter(Boolean),
      })
      if (res.error) fb(`Error: ${res.error}`)
      else { fb('Level updated'); setEditingId(null) }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-dm-sans font-bold text-lg text-brand-black">Niveles</h2>
          <button
            disabled={isPending}
            onClick={() => startTransition(async () => {
              const r = await seedDefaultLevels()
              if (r.error) fb(`Error: ${r.error}`)
              else fb('✓ Niveles restaurados')
            })}
            className="font-dm-sans text-sm font-semibold bg-gray-100 text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
          >
            Restaurar niveles por defecto
          </button>
        </div>
        <span className="font-dm-sans text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          {levels.length} niveles
        </span>
      </div>

      <Feedback msg={feedback} />

      <div className="space-y-4 mt-4">
        {levels.map((level) => (
          <div key={level.id} className="border border-gray-100 rounded-2xl p-5">
            {editingId === level.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-dm-sans text-xs text-gray-500 font-semibold uppercase">Nombre</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-dm-sans mt-1" />
                  </div>
                  <div>
                    <label className="font-dm-sans text-xs text-gray-500 font-semibold uppercase">GMV Min</label>
                    <input type="number" value={form.gmv_min} onChange={e => setForm({ ...form, gmv_min: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-dm-sans mt-1" />
                  </div>
                  <div>
                    <label className="font-dm-sans text-xs text-gray-500 font-semibold uppercase">GMV Max</label>
                    <input type="number" value={form.gmv_max} onChange={e => setForm({ ...form, gmv_max: e.target.value })} placeholder="Sin limite" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-dm-sans mt-1" />
                  </div>
                </div>
                <div>
                  <label className="font-dm-sans text-xs text-gray-500 font-semibold uppercase">Descripcion</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-dm-sans mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-dm-sans text-xs text-gray-500 font-semibold uppercase">Incluye (uno por linea)</label>
                    <textarea value={form.includes} onChange={e => setForm({ ...form, includes: e.target.value })} rows={4} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-dm-sans mt-1" />
                  </div>
                  <div>
                    <label className="font-dm-sans text-xs text-gray-500 font-semibold uppercase">No incluye (uno por linea)</label>
                    <textarea value={form.excludes} onChange={e => setForm({ ...form, excludes: e.target.value })} rows={4} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-dm-sans mt-1" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button disabled={isPending} onClick={() => handleSave(level.id)} className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50">
                    {isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => setEditingId(null)} className="font-dm-sans text-sm text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-100 transition">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-dm-sans font-bold text-brand-black">{level.name}</h3>
                  <p className="font-dm-sans text-sm text-gray-500 mt-0.5">
                    GMV: ${level.gmv_min.toLocaleString()}{level.gmv_max !== null ? ` - $${level.gmv_max.toLocaleString()}` : '+'}
                  </p>
                  {level.description && <p className="font-dm-sans text-sm text-gray-400 mt-1">{level.description}</p>}
                  {(level.includes?.length > 0 || level.excludes?.length > 0) && (
                    <div className="flex gap-4 mt-2">
                      {level.includes?.length > 0 && (
                        <div>
                          <span className="font-dm-sans text-xs text-gray-400 font-semibold">Incluye:</span>
                          <ul className="mt-1 space-y-0.5">
                            {level.includes.map((item, i) => (
                              <li key={i} className="font-dm-sans text-xs text-emerald-600">+ {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {level.excludes?.length > 0 && (
                        <div>
                          <span className="font-dm-sans text-xs text-gray-400 font-semibold">No incluye:</span>
                          <ul className="mt-1 space-y-0.5">
                            {level.excludes.map((item, i) => (
                              <li key={i} className="font-dm-sans text-xs text-red-400">- {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => startEdit(level)} className="font-dm-sans text-sm font-semibold text-brand-green hover:underline">
                  Editar
                </button>
              </div>
            )}
          </div>
        ))}
        {levels.length === 0 && (
          <p className="font-dm-sans text-sm text-gray-400 text-center py-8">No hay niveles configurados.</p>
        )}
      </div>
    </div>
  )
}

// ── Rewards Tab ──────────────────────────────────────────────────────────────
function RewardsTab({ rewards, creatorRewards, levels }: { rewards: RewardRow[]; creatorRewards: CreatorRewardRow[]; levels: LevelRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const emptyForm = { level_name: '', title: '', description: '', emoji: '', cta_text: '', cta_type: 'link', cta_url: '', requires_address: false, order_index: 0, is_active: true }
  const [form, setForm] = useState(emptyForm)

  function fb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 4000) }

  // Group rewards by level_name
  const grouped = rewards.reduce<Record<string, RewardRow[]>>((acc, r) => {
    if (!acc[r.level_name]) acc[r.level_name] = []
    acc[r.level_name].push(r)
    return acc
  }, {})

  const levelNames = levels.length > 0 ? levels.map(l => l.name) : Object.keys(grouped)

  function startEdit(r: RewardRow) {
    setEditingId(r.id)
    setForm({
      level_name: r.level_name,
      title: r.title,
      description: r.description ?? '',
      emoji: r.emoji ?? '',
      cta_text: r.cta_text ?? '',
      cta_type: r.cta_type,
      cta_url: r.cta_url ?? '',
      requires_address: r.requires_address,
      order_index: r.order_index,
      is_active: r.is_active,
    })
  }

  function handleSave(id: string) {
    startTransition(async () => {
      const res = await updateReward(id, {
        level_name: form.level_name,
        title: form.title,
        description: form.description || undefined,
        emoji: form.emoji || undefined,
        cta_text: form.cta_text || undefined,
        cta_type: form.cta_type,
        cta_url: form.cta_url || undefined,
        requires_address: form.requires_address,
        order_index: form.order_index,
        is_active: form.is_active,
      })
      if (res.error) fb(`Error: ${res.error}`)
      else { fb('Recompensa actualizada'); setEditingId(null) }
    })
  }

  function handleAdd() {
    if (!form.title || !form.level_name) { fb('Error: Titulo y nivel son requeridos'); return }
    startTransition(async () => {
      const res = await addReward({
        level_name: form.level_name,
        title: form.title,
        description: form.description || undefined,
        emoji: form.emoji || undefined,
        cta_text: form.cta_text || undefined,
        cta_type: form.cta_type || 'link',
        cta_url: form.cta_url || undefined,
        requires_address: form.requires_address,
        order_index: form.order_index,
        is_active: form.is_active,
      })
      if (res.error) fb(`Error: ${res.error}`)
      else { fb('Recompensa creada'); setShowAdd(false); setForm(emptyForm) }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Eliminar esta recompensa?')) return
    startTransition(async () => {
      await deleteReward(id)
      fb('Recompensa eliminada')
    })
  }

  function handleConfirmReward(crId: string, confirmed: boolean) {
    startTransition(async () => {
      await confirmRewardReceived(crId, confirmed)
      fb(confirmed ? 'Marcado como recibido' : 'Desmarcado')
    })
  }

  function renderRewardForm(onSave: () => void, onCancel: () => void) {
    return (
      <div className="space-y-3 border border-gray-100 rounded-2xl p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="font-dm-sans text-xs text-gray-500 font-semibold uppercase">Nivel</label>
            <select value={form.level_name} onChange={e => setForm({ ...form, level_name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-dm-sans mt-1">
              <option value="">Seleccionar...</option>
              {levelNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="font-dm-sans text-xs text-gray-500 font-semibold uppercase">Emoji</label>
            <input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-dm-sans mt-1" />
          </div>
          <div className="col-span-2">
            <label className="font-dm-sans text-xs text-gray-500 font-semibold uppercase">Titulo</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-dm-sans mt-1" />
          </div>
        </div>
        <div>
          <label className="font-dm-sans text-xs text-gray-500 font-semibold uppercase">Descripcion</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-dm-sans mt-1" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="font-dm-sans text-xs text-gray-500 font-semibold uppercase">CTA Tipo</label>
            <select value={form.cta_type} onChange={e => setForm({ ...form, cta_type: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-dm-sans mt-1">
              <option value="link">Link</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="form">Formulario</option>
              <option value="none">Ninguno</option>
            </select>
          </div>
          <div>
            <label className="font-dm-sans text-xs text-gray-500 font-semibold uppercase">CTA Texto</label>
            <input value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-dm-sans mt-1" />
          </div>
          <div className="col-span-2">
            <label className="font-dm-sans text-xs text-gray-500 font-semibold uppercase">CTA URL</label>
            <input value={form.cta_url} onChange={e => setForm({ ...form, cta_url: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-dm-sans mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="font-dm-sans text-xs text-gray-500 font-semibold uppercase">Orden</label>
            <input type="number" value={form.order_index} onChange={e => setForm({ ...form, order_index: Number(e.target.value) })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-dm-sans mt-1" />
          </div>
          <label className="flex items-center gap-2 mt-5 font-dm-sans text-sm">
            <input type="checkbox" checked={form.requires_address} onChange={e => setForm({ ...form, requires_address: e.target.checked })} className="rounded" />
            Requiere direccion
          </label>
          <label className="flex items-center gap-2 mt-5 font-dm-sans text-sm">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
            Activa
          </label>
        </div>
        <div className="flex gap-2 pt-1">
          <button disabled={isPending} onClick={onSave} className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50">
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={onCancel} className="font-dm-sans text-sm text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-100 transition">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">Recompensas</h2>
        <button onClick={() => { setShowAdd(!showAdd); setForm(emptyForm) }} className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition">
          {showAdd ? 'Cancelar' : '+ Nueva recompensa'}
        </button>
      </div>

      <Feedback msg={feedback} />

      {showAdd && (
        <div className="mb-6">
          <h3 className="font-dm-sans font-semibold text-sm text-brand-black mb-2">Nueva recompensa</h3>
          {renderRewardForm(handleAdd, () => { setShowAdd(false); setForm(emptyForm) })}
        </div>
      )}

      {/* Rewards grouped by level */}
      <div className="space-y-6">
        {levelNames.map(levelName => {
          const levelRewards = grouped[levelName]
          if (!levelRewards || levelRewards.length === 0) return null
          return (
            <div key={levelName}>
              <h3 className="font-dm-sans font-bold text-sm text-brand-black mb-3 uppercase tracking-wide">{levelName}</h3>
              <div className="space-y-3">
                {levelRewards.map(r => (
                  <div key={r.id} className="border border-gray-100 rounded-2xl p-4">
                    {editingId === r.id ? (
                      renderRewardForm(() => handleSave(r.id), () => setEditingId(null))
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {r.emoji && <span className="text-2xl">{r.emoji}</span>}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-dm-sans font-semibold text-brand-black">{r.title}</h4>
                              {!r.is_active && <span className="font-dm-sans text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactiva</span>}
                            </div>
                            {r.description && <p className="font-dm-sans text-sm text-gray-500 mt-0.5">{r.description}</p>}
                            <div className="flex gap-3 mt-1 font-dm-sans text-xs text-gray-400">
                              {r.cta_type !== 'none' && <span>CTA: {r.cta_text || r.cta_type}</span>}
                              {r.requires_address && <span className="text-amber-500">Requiere direccion</span>}
                              <span>Orden: {r.order_index}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(r)} className="font-dm-sans text-sm font-semibold text-brand-green hover:underline">
                            Editar
                          </button>
                          <button onClick={() => handleDelete(r.id)} className="font-dm-sans text-sm font-semibold text-red-500 hover:underline">
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {rewards.length === 0 && (
          <p className="font-dm-sans text-sm text-gray-400 text-center py-8">No hay recompensas configuradas.</p>
        )}
      </div>

      {/* Reclamos section */}
      <div className="mt-10">
        <h2 className="font-dm-sans font-bold text-lg text-brand-black mb-4">Reclamos</h2>
        {creatorRewards.length === 0 ? (
          <p className="font-dm-sans text-sm text-gray-400 text-center py-8">No hay reclamos todavia.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-sm font-dm-sans">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Creator', 'Recompensa', 'Nivel', 'Reclamado', 'Envio', 'Recibido'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {creatorRewards.map(cr => (
                  <tr key={cr.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-brand-black whitespace-nowrap">
                      {cr.creator?.name || cr.creator?.email || '-'}
                      {cr.creator?.email && cr.creator?.name && (
                        <p className="text-xs text-gray-400 font-normal">{cr.creator.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{cr.reward?.title || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{cr.reward?.level_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(cr.claimed_at).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {cr.shipping_name || cr.shipping_address ? (
                        <div>
                          {cr.shipping_name && <p className="font-medium">{cr.shipping_name}</p>}
                          {cr.shipping_phone && <p>{cr.shipping_phone}</p>}
                          {cr.shipping_address && <p className="max-w-xs truncate">{cr.shipping_address}</p>}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cr.admin_confirmed}
                          disabled={isPending}
                          onChange={(e) => handleConfirmReward(cr.id, e.target.checked)}
                          className="rounded"
                        />
                        <span className="font-dm-sans text-xs text-gray-500">
                          {cr.admin_confirmed ? 'Recibido' : 'Marcar como recibido'}
                        </span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Admin Panel ──────────────────────────────────────────────────────────
type Tab = 'creators' | 'products' | 'campaigns' | 'applications' | 'requests' | 'initiation' | 'strategy' | 'levels' | 'rewards' | 'settings'

export default function AdminPanel({ creators, products, campaigns, applications, productRequests, initiationSelections, levels, rewards, creatorRewards }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('creators')
  const [isPending, startTransition] = useTransition()

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'creators', label: 'Creators', count: creators.length },
    { id: 'applications', label: 'Applications', count: applications.length },
    { id: 'requests', label: 'Requests', count: productRequests.filter((r) => r.status === 'pending').length },
    { id: 'campaigns', label: 'Campaigns', count: campaigns.length },
    { id: 'products', label: 'Products', count: products.length },
    { id: 'strategy', label: 'Strategy' },
    { id: 'initiation', label: 'Initiation', count: initiationSelections.filter((s, i, arr) => arr.findIndex((x) => x.creator_id === s.creator_id) === i).length },
    { id: 'levels', label: 'Niveles', count: levels.length },
    { id: 'rewards', label: 'Recompensas', count: rewards.length },
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
                src="https://nptkinihgouicdimytbf.supabase.co/storage/v1/object/public/PSC%20LOGOS/Long_green.png"
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
          {activeTab === 'levels' && <LevelsTab levels={levels} />}
          {activeTab === 'rewards' && <RewardsTab rewards={rewards} creatorRewards={creatorRewards} levels={levels} />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  )
}
