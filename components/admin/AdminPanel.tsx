'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Creator, Product, Campaign, CreatorLevel } from '@/lib/types'
import StrategyManager from '@/components/admin/StrategyManager'
import {
  adminLogout,
  addCreator, updateCreatorGMV, updateCreatorLevel, toggleCreatorActive, deleteCreator,
  addProduct, updateProduct, deleteProduct, toggleProductExclusive,
  addCampaign, updateCampaignSpots, toggleCampaignStatus, deleteCampaign,
  assignTask, bulkAssignTask,
} from '@/app/admin/actions'

interface TodayTask {
  id: string
  task_name: string | null
  is_hero: boolean
  completed: boolean
  creator: { name: string | null; email: string } | null
  product: { name: string } | null
}

interface ApplicationRow {
  id: string
  posts_offered: number | null
  live_hours_offered: number | null
  price_offered: number | null
  created_at: string
  creator: { name: string | null; email: string } | null
  campaign: { brand_name: string } | null
}

interface AdminPanelProps {
  creators: Creator[]
  products: Product[]
  campaigns: Campaign[]
  todayTasks: TodayTask[]
  applications: ApplicationRow[]
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
  const isError = msg.startsWith('Fehler')
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
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '' })
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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
          {showAdd ? 'Abbrechen' : '+ Creator einladen'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-brand-light-pink border border-brand-pink/20 rounded-2xl p-5 mb-5">
          <h3 className="font-dm-sans font-semibold text-sm text-brand-black mb-3">Neuen Creator einladen</h3>
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
              placeholder="E-Mail"
              value={addForm.email}
              onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              className="input-field"
            />
          </div>
          <button
            disabled={isPending || !addForm.email}
            onClick={() => startTransition(async () => {
              const r = await addCreator(addForm.name, addForm.email)
              if (r.error) fb(`Fehler: ${r.error}`)
              else { fb('✓ Creator eingeladen!'); setAddForm({ name: '', email: '' }); setShowAdd(false) }
            })}
            className="mt-3 font-dm-sans text-sm font-semibold bg-brand-green text-white px-5 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
          >
            {isPending ? 'Einladen...' : 'Einladung senden'}
          </button>
        </div>
      )}

      <Feedback msg={feedback} />

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm font-dm-sans">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'E-Mail', 'Level', 'GMV', 'Streak', 'Status', 'Aktionen'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {creators.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Keine Creator vorhanden.</td></tr>
            )}
            {creators.map((c) => (
              <tr key={c.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-brand-black whitespace-nowrap">{c.name || '–'}</td>
                <td className="px-4 py-3 text-gray-500">{c.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={c.level}
                    disabled={isPending}
                    onChange={(e) => startTransition(async () => {
                      await updateCreatorLevel(c.id, e.target.value as CreatorLevel)
                      fb('✓ Level aktualisiert')
                    })}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${LEVEL_COLORS[c.level]}`}
                  >
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {editingGMV?.id === c.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">€</span>
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
                          if (r.error) fb(`Fehler: ${r.error}`)
                          else fb('✓ GMV gespeichert')
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
                      €{c.gmv.toLocaleString('de-DE')}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{c.streak > 0 ? `🔥 ${c.streak}` : '–'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    {c.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => {
                        await toggleCreatorActive(c.id, !c.is_active)
                        fb(`✓ Creator ${c.is_active ? 'deaktiviert' : 'aktiviert'}`)
                      })}
                      className="text-xs text-gray-500 hover:text-brand-green transition px-2 py-1 rounded-lg hover:bg-gray-100"
                    >
                      {c.is_active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        if (confirm(`"${c.name || c.email}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
                          startTransition(async () => {
                            const r = await deleteCreator(c.id)
                            if (r.error) fb(`Fehler: ${r.error}`)
                            else fb('✓ Creator gelöscht')
                          })
                        }
                      }}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                    >
                      Löschen
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
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">Produkte</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition">
          {showAdd ? 'Abbrechen' : '+ Produkt hinzufügen'}
        </button>
      </div>

      {/* Manage Tags */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-5">
        <h3 className="font-dm-sans font-semibold text-sm text-brand-black mb-2">Tags verwalten</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {availableTags.map((tag) => (
            <span key={tag} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${tagColor(tag)}`}>
              {tag}
              {!DEFAULT_TAGS.includes(tag) && (
                <button
                  onClick={() => setAvailableTags((t) => t.filter((x) => x !== tag))}
                  className="opacity-60 hover:opacity-100 ml-0.5 leading-none"
                  aria-label={`${tag} entfernen`}
                >×</button>
              )}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Neuen Tag hinzufügen…"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
            className="input-field flex-1 max-w-xs"
          />
          <button
            onClick={addCustomTag}
            className="font-dm-sans text-sm font-semibold bg-brand-black text-white px-4 py-2 rounded-xl hover:bg-brand-black/80 transition"
          >
            + Hinzufügen
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-brand-light-pink border border-brand-pink/20 rounded-2xl p-5 mb-5">
          <h3 className="font-dm-sans font-semibold text-sm mb-3 text-brand-black">Neues Produkt</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field col-span-2 sm:col-span-1" />
            <input placeholder="Provision %" type="number" value={form.commission_rate} onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))} className="input-field" />
            <input placeholder="Conversion %" type="number" value={form.conversion_rate} onChange={(e) => setForm((f) => ({ ...f, conversion_rate: e.target.value }))} className="input-field" />
            <input placeholder="Nische (z.B. Beauty)" value={form.niche} onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))} className="input-field" />
            <input placeholder="Bild-URL" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} className="input-field" />
            <input placeholder="Produkt-Link" value={form.product_link} onChange={(e) => setForm((f) => ({ ...f, product_link: e.target.value }))} className="input-field" />
            <label className="flex items-center gap-2 font-dm-sans text-sm text-gray-700">
              <input type="checkbox" checked={form.is_exclusive} onChange={(e) => setForm((f) => ({ ...f, is_exclusive: e.target.checked }))} className="rounded" />
              Exklusiv
            </label>
          </div>
          {form.image_url && (
            <div className="mt-3">
              <p className="font-dm-sans text-xs text-gray-400 mb-1">Vorschau:</p>
              <img src={form.image_url} alt="Vorschau" className="w-16 h-16 object-cover rounded-lg border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
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
              if (r.error) fb(`Fehler: ${r.error}`)
              else {
                fb('✓ Produkt hinzugefügt')
                setForm({ name: '', commission_rate: '', conversion_rate: '', niche: '', is_exclusive: false, image_url: '', product_link: '', tags: [] })
                setShowAdd(false)
              }
            })}
            className="mt-4 font-dm-sans text-sm font-semibold bg-brand-green text-white px-5 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
          >
            {isPending ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      )}

      <Feedback msg={feedback} />

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm font-dm-sans">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Bild', 'Name', 'Provision', 'Conversion', 'Nische', 'Tags', 'Exklusiv', 'Aktionen'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Keine Produkte vorhanden.</td></tr>
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
                <td className="px-4 py-3 text-gray-600">{p.conversion_rate}%</td>
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
                    onClick={() => startTransition(async () => { await toggleProductExclusive(p.id, !p.is_exclusive); fb('✓ Gespeichert') })}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition ${p.is_exclusive ? 'bg-brand-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {p.is_exclusive ? 'Exklusiv ✓' : 'Normal'}
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
                            fb('✓ Aktualisiert'); setEditingId(null); setEditForm({})
                          })}
                          className="text-xs bg-brand-green text-white px-2.5 py-1 rounded-lg"
                        >Speichern</button>
                        <button onClick={() => { setEditingId(null); setEditForm({}) }} className="text-xs text-gray-400 hover:text-gray-600">Abbrechen</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditingId(p.id)} className="text-xs text-gray-500 hover:text-brand-green px-2 py-1 rounded-lg hover:bg-gray-100 transition">Bearbeiten</button>
                        <button
                          disabled={isPending}
                          onClick={() => { if (confirm(`"${p.name}" wirklich löschen?`)) startTransition(async () => { await deleteProduct(p.id); fb('✓ Gelöscht') }) }}
                          className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                        >Löschen</button>
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
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">Kampagnen</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition">
          {showAdd ? 'Abbrechen' : '+ Kampagne hinzufügen'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-brand-light-pink border border-brand-pink/20 rounded-2xl p-5 mb-5">
          <h3 className="font-dm-sans font-semibold text-sm mb-3 text-brand-black">Neue Kampagne</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Markenname" value={form.brand_name} onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))} className="input-field" />
            <input placeholder="Beschreibung" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input-field" />
            <input placeholder="Provision %" type="number" value={form.commission_rate} onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))} className="input-field" />
            <input placeholder="Plätze verfügbar" type="number" value={form.spots_left} onChange={(e) => setForm((f) => ({ ...f, spots_left: e.target.value }))} className="input-field" />
            <input placeholder="Deadline" type="datetime-local" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} className="input-field" />
            <select value={form.min_level} onChange={(e) => setForm((f) => ({ ...f, min_level: e.target.value as CreatorLevel }))} className="input-field">
              {LEVELS.map((l) => <option key={l} value={l}>ab {l}</option>)}
            </select>
            <input placeholder="Brand Logo URL" value={form.brand_logo_url} onChange={(e) => setForm((f) => ({ ...f, brand_logo_url: e.target.value }))} className="input-field" />
            <select value={form.product_id} onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))} className="input-field">
              <option value="">Produkt verknüpfen (optional)</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Budget (€)" type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} className="input-field" />
            <input placeholder="Produkt-Link (Showcase)" value={form.product_link} onChange={(e) => setForm((f) => ({ ...f, product_link: e.target.value }))} className="input-field" />
            <label className="flex items-center gap-2 font-dm-sans text-sm text-gray-700 sm:col-span-2">
              <input type="checkbox" checked={form.sample_available} onChange={(e) => setForm((f) => ({ ...f, sample_available: e.target.checked }))} className="rounded" />
              Sample verfügbar
            </label>
          </div>
          {form.brand_logo_url && (
            <div className="mt-3">
              <p className="font-dm-sans text-xs text-gray-400 mb-1">Logo-Vorschau:</p>
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
              if (r.error) fb(`Fehler: ${r.error}`)
              else {
                fb('✓ Kampagne erstellt')
                setForm({ brand_name: '', description: '', commission_rate: '', spots_left: '', deadline: '', min_level: 'Initiation', status: 'active', brand_logo_url: '', product_id: '', budget: '', product_link: '', sample_available: false })
                setShowAdd(false)
              }
            })}
            className="mt-3 font-dm-sans text-sm font-semibold bg-brand-green text-white px-5 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
          >
            {isPending ? 'Speichern...' : 'Kampagne starten'}
          </button>
        </div>
      )}

      <Feedback msg={feedback} />

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm font-dm-sans">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Logo', 'Marke', 'Provision', 'Plätze', 'Budget', 'Deadline', 'Min. Level', 'Status', 'Aktionen'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {campaigns.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Keine Kampagnen vorhanden.</td></tr>
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
                      <button onClick={() => startTransition(async () => { await updateCampaignSpots(c.id, parseInt(editingSpots.value)); fb('✓ Plätze aktualisiert'); setEditingSpots(null) })} className="text-xs bg-brand-green text-white px-2 py-1 rounded-lg">✓</button>
                      <button onClick={() => setEditingSpots(null)} className="text-xs text-gray-400">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingSpots({ id: c.id, value: String(c.spots_left ?? 0) })} className={`font-semibold hover:underline ${(c.spots_left ?? 0) <= 3 ? 'text-orange-600' : 'text-gray-700'}`}>
                      {c.spots_left ?? '–'}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {c.budget ? `€${c.budget.toLocaleString('de-DE')}` : '–'}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                  {c.deadline ? new Date(c.deadline).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_COLORS[c.min_level] || 'bg-gray-100 text-gray-600'}`}>
                    ab {c.min_level}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                      {c.status === 'active' ? 'Aktiv' : 'Inaktiv'}
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
                      onClick={() => startTransition(async () => { await toggleCampaignStatus(c.id, c.status); fb(`✓ Kampagne ${c.status === 'active' ? 'deaktiviert' : 'aktiviert'}`) })}
                      className="text-xs text-gray-500 hover:text-brand-green px-2 py-1 rounded-lg hover:bg-gray-100 transition"
                    >
                      {c.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        if (confirm(`Kampagne "${c.brand_name}" wirklich löschen?`)) {
                          startTransition(async () => { await deleteCampaign(c.id); fb('✓ Kampagne gelöscht') })
                        }
                      }}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                    >
                      Löschen
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

// ── Tasks Tab ─────────────────────────────────────────────────────────────────
function TasksTab({ creators, products, todayTasks }: { creators: Creator[]; products: Product[]; todayTasks: TodayTask[] }) {
  const [assignForm, setAssignForm] = useState({ creator_id: '', product_id: '', task_name: '', is_hero: false })
  const [bulkForm, setBulkForm] = useState({ level: 'Initiation' as CreatorLevel, product_id: '', task_name: '', is_hero: false })
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function fb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 5000) }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-dm-sans font-bold text-base text-brand-black mb-3">Aufgabe zuweisen</h2>
        <div className="bg-brand-light-pink border border-brand-pink/20 rounded-2xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={assignForm.creator_id} onChange={(e) => setAssignForm((f) => ({ ...f, creator_id: e.target.value }))} className="input-field">
              <option value="">Creator auswählen…</option>
              {creators.filter((c) => c.is_active).map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.email}</option>
              ))}
            </select>
            <select value={assignForm.product_id} onChange={(e) => setAssignForm((f) => ({ ...f, product_id: e.target.value }))} className="input-field">
              <option value="">Produkt auswählen…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Aufgabenname (z.B. TikTok-Video posten)" value={assignForm.task_name} onChange={(e) => setAssignForm((f) => ({ ...f, task_name: e.target.value }))} className="input-field sm:col-span-2" />
            <label className="flex items-center gap-2 font-dm-sans text-sm text-gray-700">
              <input type="checkbox" checked={assignForm.is_hero} onChange={(e) => setAssignForm((f) => ({ ...f, is_hero: e.target.checked }))} className="rounded" />
              Als Hero-Produkt markieren
            </label>
          </div>
          <button
            disabled={isPending || !assignForm.creator_id || !assignForm.product_id || !assignForm.task_name}
            onClick={() => startTransition(async () => {
              const r = await assignTask({ creator_id: assignForm.creator_id, product_id: assignForm.product_id, task_name: assignForm.task_name, is_hero: assignForm.is_hero })
              if (r.error) fb(`Fehler: ${r.error}`)
              else { fb('✓ Aufgabe zugewiesen!'); setAssignForm({ creator_id: '', product_id: '', task_name: '', is_hero: false }) }
            })}
            className="mt-3 font-dm-sans text-sm font-semibold bg-brand-green text-white px-5 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
          >
            {isPending ? 'Zuweisen...' : 'Aufgabe zuweisen'}
          </button>
        </div>
      </div>

      <div>
        <h2 className="font-dm-sans font-bold text-base text-brand-black mb-3">Bulk-Zuweisung nach Level</h2>
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={bulkForm.level} onChange={(e) => setBulkForm((f) => ({ ...f, level: e.target.value as CreatorLevel }))} className="input-field">
              {LEVELS.map((l) => <option key={l} value={l}>Level: {l}</option>)}
            </select>
            <select value={bulkForm.product_id} onChange={(e) => setBulkForm((f) => ({ ...f, product_id: e.target.value }))} className="input-field">
              <option value="">Produkt auswählen…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Aufgabenname" value={bulkForm.task_name} onChange={(e) => setBulkForm((f) => ({ ...f, task_name: e.target.value }))} className="input-field sm:col-span-2" />
            <label className="flex items-center gap-2 font-dm-sans text-sm text-gray-700">
              <input type="checkbox" checked={bulkForm.is_hero} onChange={(e) => setBulkForm((f) => ({ ...f, is_hero: e.target.checked }))} className="rounded" />
              Als Hero-Produkt markieren
            </label>
          </div>
          <button
            disabled={isPending || !bulkForm.product_id || !bulkForm.task_name}
            onClick={() => startTransition(async () => {
              const r = await bulkAssignTask({ level: bulkForm.level, product_id: bulkForm.product_id, task_name: bulkForm.task_name, is_hero: bulkForm.is_hero })
              if (r.error) fb(`Fehler: ${r.error}`)
              else { fb(`✓ ${r.count} Creator zugewiesen!`); setBulkForm({ level: 'Initiation', product_id: '', task_name: '', is_hero: false }) }
            })}
            className="mt-3 font-dm-sans text-sm font-semibold bg-brand-green text-white px-5 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
          >
            {isPending ? 'Zuweisen...' : 'Alle zuweisen'}
          </button>
        </div>
      </div>

      <Feedback msg={feedback} />

      <div>
        <h2 className="font-dm-sans font-bold text-base text-brand-black mb-3">
          Heutige Aufgaben{' '}
          <span className="font-normal text-gray-400 text-sm">
            ({todayTasks.filter((t) => t.completed).length}/{todayTasks.length} erledigt)
          </span>
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-sm font-dm-sans">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Creator', 'Aufgabe', 'Produkt', 'Hero', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {todayTasks.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Keine Aufgaben heute.</td></tr>
              )}
              {todayTasks.map((t) => (
                <tr key={t.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-brand-black">{t.creator?.name || t.creator?.email || '–'}</td>
                  <td className="px-4 py-3 text-gray-700">{t.task_name || '–'}</td>
                  <td className="px-4 py-3 text-gray-500">{t.product?.name || '–'}</td>
                  <td className="px-4 py-3">{t.is_hero && <span className="font-dm-sans text-xs font-bold bg-brand-black text-white px-2 py-0.5 rounded-full">★ Hero</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${t.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {t.completed ? '✓ Erledigt' : '○ Offen'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Applications Tab ──────────────────────────────────────────────────────────
function ApplicationsTab({ applications }: { applications: ApplicationRow[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">Kampagnen-Bewerbungen</h2>
        <span className="font-dm-sans text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          {applications.length} gesamt
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm font-dm-sans">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Creator', 'Kampagne', 'Posts', 'Live-Stunden', 'Angebot (€)', 'Datum'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {applications.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Noch keine Bewerbungen.</td></tr>
            )}
            {applications.map((a) => (
              <tr key={a.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-brand-black whitespace-nowrap">
                  {a.creator?.name || a.creator?.email || '–'}
                  {a.creator?.email && a.creator?.name && (
                    <p className="text-xs text-gray-400 font-normal">{a.creator.email}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                  {a.campaign?.brand_name || '–'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-semibold text-brand-black">{a.posts_offered ?? '–'}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-semibold text-brand-black">{a.live_hours_offered ?? '–'}h</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-bold text-brand-green">
                    {a.price_offered != null ? `€${Number(a.price_offered).toLocaleString('de-DE')}` : '–'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {new Date(a.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Admin Panel ──────────────────────────────────────────────────────────
type Tab = 'creators' | 'products' | 'campaigns' | 'tasks' | 'applications' | 'strategy'

export default function AdminPanel({ creators, products, campaigns, todayTasks, applications }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('creators')
  const [isPending, startTransition] = useTransition()

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'creators', label: 'Creators', count: creators.length },
    { id: 'products', label: 'Produkte', count: products.length },
    { id: 'campaigns', label: 'Kampagnen', count: campaigns.length },
    { id: 'tasks', label: 'Aufgaben', count: todayTasks.length },
    { id: 'applications', label: 'Bewerbungen', count: applications.length },
    { id: 'strategy', label: 'Estrategia' },
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
                ← App ansehen
              </a>
              <button
                disabled={isPending}
                onClick={() => startTransition(async () => { await adminLogout() })}
                className="font-dm-sans text-sm font-semibold text-brand-black bg-brand-pink hover:bg-brand-pink/90 px-4 py-2 rounded-xl transition disabled:opacity-50"
              >
                Abmelden
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
                {tab.count !== undefined && (
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
          {activeTab === 'tasks' && <TasksTab creators={creators} products={products} todayTasks={todayTasks} />}
          {activeTab === 'applications' && <ApplicationsTab applications={applications} />}
          {activeTab === 'strategy' && <StrategyManager creators={creators} products={products} campaigns={campaigns} />}
        </div>
      </div>
    </div>
  )
}
