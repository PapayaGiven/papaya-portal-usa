'use client'

import { useEffect, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Creator, Product, Campaign, CreatorLevel, CreatorMonthlyStats, CreatorVideo, CallNote, PapayaPick, computePapayaPickScore } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import StrategyManager from '@/components/admin/StrategyManager'
import {
  adminLogout,
  addCreator, updateCreatorGMV, updateCreatorLevel, updateCreatorPersonalGoal, toggleCreatorActive, updateCreatorEliteSettings, regenerateAccessCode,
  addProduct, updateProduct, deleteProduct, toggleProductExclusive, toggleProductInitiation,
  addCampaign, updateCampaign, updateCampaignSpots, toggleCampaignStatus, deleteCampaign,
  updateProductRequestStatus,
  updateLevel, seedDefaultLevels, addReward, updateReward, deleteReward, confirmRewardReceived,
  updateSettings,
  updateLevelConfig,
  addDeliverable, updateDeliverableStatus, deleteDeliverable,
  addAnnouncement, updateAnnouncement, deleteAnnouncement, uploadAnnouncementImage,
  updateCreatorContact, upsertCreatorMonthlyStats, deleteCreatorMonthlyStats,
  addCreatorVideo, deleteCreatorVideo,
  addCallNote, deleteCallNote, getCreatorAdminBundle,
  addPapayaPick, updatePapayaPick, deletePapayaPick, togglePapayaPick,
} from '@/app/admin/actions'

async function uploadToStorage(bucket: string, file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(fileName, file)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName)
  return publicUrl
}
import { SiteSettings } from '@/lib/types'

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

interface DeliverableRow {
  id: string
  creator_id: string
  brand_name: string
  deliverable_type: string
  due_date: string | null
  status: string
  notes: string | null
  created_at: string
  creator?: { name: string | null; email: string } | null
}

interface AnnouncementRow {
  id: string
  title: string
  body: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
}

interface ViolationRow {
  id: string
  creator_id: string
  description: string
  status: string
  screenshot_urls: string[]
  created_at: string
  creator?: { name: string | null; email: string } | null
}

interface LevelConfigRow {
  level_name: string
  videos_per_day: number
  hero_products: number
  hero_videos_each: number
  sub_hero_products: number
  sub_hero_videos_each: number
  complementary_videos: number
  winner_videos: number
  has_creative_bank: boolean
  has_deliverables_board: boolean
  has_brand_pipeline: boolean
  has_retainer: boolean
  calls_per_month: number
  call_frequency: string
  has_masterclass: boolean
  has_mastermind: boolean
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
  settings: SiteSettings | null
  deliverables: DeliverableRow[]
  levelConfigs: LevelConfigRow[]
  violations: ViolationRow[]
  announcements: AnnouncementRow[]
  papayaPicks: PapayaPick[]
}

const LEVELS: CreatorLevel[] = ['Initiation', 'Foundation', 'Growth', 'Scale', 'Elite']
const LEVEL_COLORS: Record<CreatorLevel, string> = {
  Initiation: 'bg-[#F1EFE8] text-[#444441]',
  Foundation: 'bg-[#E6F1FB] text-[#0C447C]',
  Growth: 'bg-[#E1F5EE] text-[#085041]',
  Scale: 'bg-[#EEEDFE] text-[#3C3489]',
  Elite: 'bg-[#FAEEDA] text-[#633806]',
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

const LEVELS_FOR_FILTER: ('All' | CreatorLevel)[] = ['All', 'Initiation', 'Foundation', 'Growth', 'Scale', 'Elite']

function initials(name: string | null, email: string): string {
  const src = (name ?? email).trim()
  if (!src) return '?'
  const parts = src.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function CreatorsTab({ creators, products, campaigns }: { creators: Creator[]; products: Product[]; campaigns: Campaign[] }) {
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<'All' | CreatorLevel>('All')
  const [selectedId, setSelectedId] = useState<string | null>(creators[0]?.id ?? null)
  const [subTab, setSubTab] = useState<'overview' | 'estrategia' | 'crecimiento' | 'todo' | 'calls'>('overview')
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '' })
  const [generatedCode, setGeneratedCode] = useState<{ name: string; code: string } | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function fb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 4000) }
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => fb(`✓ ${label} copiado`))
  }

  const filtered = creators.filter((c) => {
    if (levelFilter !== 'All' && c.level !== levelFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const hay = `${c.name ?? ''} ${c.email ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const selected = creators.find((c) => c.id === selectedId) ?? null

  return (
    <div className="flex flex-col lg:flex-row gap-4 -m-2">
      {/* Left panel — creator list */}
      <aside className="w-full lg:w-[280px] shrink-0 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        <div className="p-3 space-y-2 border-b border-gray-100">
          <input
            type="search"
            placeholder="Buscar creator…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full text-sm"
          />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as 'All' | CreatorLevel)}
            className="input-field w-full text-xs"
          >
            {LEVELS_FOR_FILTER.map((l) => (
              <option key={l} value={l}>{l === 'All' ? 'Todos los niveles' : l}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filtered.length === 0 && (
            <p className="p-4 text-xs text-gray-400 text-center">Sin resultados.</p>
          )}
          {filtered.map((c) => {
            const active = c.id === selectedId
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left p-3 flex items-center gap-3 transition ${active ? 'bg-brand-light-pink/60' : 'hover:bg-white'}`}
              >
                <div className="w-9 h-9 rounded-full bg-brand-pink/20 text-brand-green font-dm-sans font-bold text-xs flex items-center justify-center shrink-0">
                  {initials(c.name, c.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-dm-sans text-sm font-semibold text-brand-black truncate">{c.name || '(sin nombre)'}</p>
                  <p className="font-dm-sans text-[11px] text-gray-400 truncate">{c.phone_number || c.email}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[c.level]}`}>{c.level}</span>
                    <span className="text-[10px] text-gray-500 font-dm-sans">${c.gmv.toLocaleString('en-US')}</span>
                    {c.personal_gmv_goal > 0 && c.gmv < c.personal_gmv_goal * 0.7 && (
                      <span title="Bajo proyección" className="text-[11px]">⚠️</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="w-full font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition"
          >
            {showAdd ? 'Cancelar' : '+ Add creator'}
          </button>
          {showAdd && (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                placeholder="Nombre"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                className="input-field w-full text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                className="input-field w-full text-sm"
              />
              <button
                disabled={isPending || !addForm.email}
                onClick={() => startTransition(async () => {
                  const r = await addCreator(addForm.name, addForm.email)
                  if (r.error) fb(`Error: ${r.error}`)
                  else {
                    fb('✓ Creator created!')
                    if (r.access_code) setGeneratedCode({ name: addForm.name || addForm.email, code: r.access_code })
                    setAddForm({ name: '', email: '' }); setShowAdd(false)
                  }
                })}
                className="w-full text-xs font-semibold bg-brand-black text-white px-3 py-2 rounded-lg hover:bg-brand-black/80 transition disabled:opacity-50"
              >
                {isPending ? 'Creando…' : 'Crear y generar código'}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Right panel — profile */}
      <section className="flex-1 min-w-0">
        {generatedCode && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 mb-4 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="font-dm-sans font-bold text-sm text-emerald-800">✓ {generatedCode.name} creada — comparte el código</p>
            </div>
            <code className="font-mono font-bold text-base tracking-widest text-emerald-900 bg-white border border-emerald-300 rounded-lg px-3 py-1.5">
              {generatedCode.code}
            </code>
            <button onClick={() => copyToClipboard(generatedCode.code, 'Código')} className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition">Copiar</button>
            <button onClick={() => setGeneratedCode(null)} className="text-emerald-600/60 hover:text-emerald-800 text-lg leading-none shrink-0">×</button>
          </div>
        )}
        <Feedback msg={feedback} />

        {!selected && (
          <div className="text-center py-20 text-gray-400 font-dm-sans">
            Selecciona un creator de la lista.
          </div>
        )}

        {selected && (
          <>
            <div className="bg-white border border-gray-100 rounded-2xl mb-4 p-4 flex items-center gap-4 flex-wrap">
              <div className="w-12 h-12 rounded-full bg-brand-pink/20 text-brand-green font-dm-sans font-bold text-base flex items-center justify-center shrink-0">
                {initials(selected.name, selected.email)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-playfair text-2xl text-brand-black leading-tight">{selected.name || '(sin nombre)'}</h2>
                <p className="font-dm-sans text-xs text-gray-400 truncate">{selected.email}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${LEVEL_COLORS[selected.level]}`}>{selected.level}</span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${selected.has_completed_onboarding ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                {selected.has_completed_onboarding ? '✓ Onboarding completado' : '⏳ Pendiente'}
              </span>
            </div>

            <div className="flex gap-1 border-b border-gray-100 mb-4 overflow-x-auto">
              {([
                ['overview', 'Overview'],
                ['estrategia', 'Estrategia'],
                ['crecimiento', 'Crecimiento'],
                ['todo', 'To Do'],
                ['calls', 'Calls'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSubTab(key)}
                  className={`px-4 py-2 font-dm-sans text-sm font-medium whitespace-nowrap border-b-2 transition ${
                    subTab === key
                      ? 'border-brand-green text-brand-green'
                      : 'border-transparent text-gray-500 hover:text-brand-black'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {subTab === 'overview' && (
              <CreatorOverview creator={selected} startTransition={startTransition} isPending={isPending} fb={fb} copyToClipboard={copyToClipboard} />
            )}
            {subTab === 'estrategia' && (
              <StrategyManager creators={creators} products={products} campaigns={campaigns} defaultCreatorId={selected.id} hideCreatorPicker />
            )}
            {subTab === 'crecimiento' && (
              <CreatorCrecimiento creator={selected} products={products} startTransition={startTransition} isPending={isPending} fb={fb} />
            )}
            {subTab === 'todo' && (
              <CreatorTodo creator={selected} startTransition={startTransition} isPending={isPending} fb={fb} />
            )}
            {subTab === 'calls' && (
              <CreatorCalls creator={selected} startTransition={startTransition} isPending={isPending} fb={fb} />
            )}
          </>
        )}
      </section>
    </div>
  )
}

// ── Creator Overview sub-tab ────────────────────────────────────────────────

function CreatorOverview({ creator, startTransition, isPending, fb, copyToClipboard }: {
  creator: Creator
  startTransition: (cb: () => void) => void
  isPending: boolean
  fb: (msg: string) => void
  copyToClipboard: (text: string, label: string) => void
}) {
  const [form, setForm] = useState({
    name: creator.name ?? '',
    email: creator.email ?? '',
    phone_number: creator.phone_number ?? '',
    level: creator.level,
    gmv: String(creator.gmv ?? 0),
    personal_gmv_goal: String(creator.personal_gmv_goal ?? 0),
    is_active: creator.is_active,
    booking_link: creator.booking_link ?? '',
    account_manager_name: creator.account_manager_name ?? '',
    account_manager_whatsapp: creator.account_manager_whatsapp ?? '',
    whatsapp_number: creator.whatsapp_number ?? '',
  })

  function inputCls() {
    return 'input-field w-full text-sm'
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="font-dm-sans font-bold text-sm text-brand-black mb-3">Código de acceso</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {creator.access_code ? (
            <code className="font-mono text-lg font-bold tracking-widest text-brand-black bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5">
              {creator.access_code}
            </code>
          ) : (
            <span className="text-sm text-gray-400 italic">Sin código asignado</span>
          )}
          {creator.access_code && (
            <>
              <button onClick={() => copyToClipboard(creator.access_code!, 'Código')} className="text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition">📋 Copiar</button>
              <button
                disabled={isPending}
                onClick={() => {
                  if (confirm(`¿Regenerar código de acceso para ${creator.name || creator.email}? El código anterior dejará de funcionar.`)) {
                    startTransition(async () => {
                      const r = await regenerateAccessCode(creator.id)
                      if (r.error) fb(`Error: ${r.error}`)
                      else fb(`✓ Nuevo código: ${r.access_code}`)
                    })
                  }
                }}
                className="text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
              >↻ Regenerar</button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
        <h3 className="font-dm-sans font-bold text-sm text-brand-black">Datos de contacto</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Nombre</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls()} /></div>
          <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Email</label><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls()} /></div>
          <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Teléfono</label><input value={form.phone_number} onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} placeholder="+1..." className={inputCls()} /></div>
          <div><label className="text-xs font-semibold text-gray-500 mb-1 block">WhatsApp</label><input value={form.whatsapp_number} onChange={(e) => setForm((f) => ({ ...f, whatsapp_number: e.target.value }))} placeholder="+1..." className={inputCls()} /></div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
        <h3 className="font-dm-sans font-bold text-sm text-brand-black">Nivel y metas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Nivel</label>
            <select value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as CreatorLevel }))} className={inputCls()}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-semibold text-gray-500 mb-1 block">GMV ($)</label><input type="number" value={form.gmv} onChange={(e) => setForm((f) => ({ ...f, gmv: e.target.value }))} className={inputCls()} /></div>
          <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Personal GMV goal ($)</label><input type="number" value={form.personal_gmv_goal} onChange={(e) => setForm((f) => ({ ...f, personal_gmv_goal: e.target.value }))} className={inputCls()} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded" />
          Activo
        </label>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
        <h3 className="font-dm-sans font-bold text-sm text-brand-black">Account manager + booking</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xs font-semibold text-gray-500 mb-1 block">AM nombre</label><input value={form.account_manager_name} onChange={(e) => setForm((f) => ({ ...f, account_manager_name: e.target.value }))} className={inputCls()} /></div>
          <div><label className="text-xs font-semibold text-gray-500 mb-1 block">AM WhatsApp</label><input value={form.account_manager_whatsapp} onChange={(e) => setForm((f) => ({ ...f, account_manager_whatsapp: e.target.value }))} placeholder="+1..." className={inputCls()} /></div>
          <div className="sm:col-span-2"><label className="text-xs font-semibold text-gray-500 mb-1 block">Booking link</label><input type="url" value={form.booking_link} onChange={(e) => setForm((f) => ({ ...f, booking_link: e.target.value }))} placeholder="https://calendar..." className={inputCls()} /></div>
        </div>
      </div>

      <button
        disabled={isPending}
        onClick={() => startTransition(async () => {
          const errs: string[] = []
          const r1 = await updateCreatorContact(creator.id, { name: form.name, email: form.email, phone_number: form.phone_number })
          if (r1.error) errs.push(r1.error)
          if (form.level !== creator.level) {
            const r2 = await updateCreatorLevel(creator.id, form.level)
            if (r2.error) errs.push(r2.error)
          }
          const newGmv = parseFloat(form.gmv) || 0
          if (newGmv !== creator.gmv) {
            const r3 = await updateCreatorGMV(creator.id, newGmv)
            if (r3.error) errs.push(r3.error)
          }
          const newGoal = parseFloat(form.personal_gmv_goal) || 0
          if (newGoal !== creator.personal_gmv_goal) {
            const r4 = await updateCreatorPersonalGoal(creator.id, newGoal)
            if (r4.error) errs.push(r4.error)
          }
          if (form.is_active !== creator.is_active) {
            await toggleCreatorActive(creator.id, form.is_active)
          }
          const r5 = await updateCreatorEliteSettings(creator.id, {
            whatsapp_number: form.whatsapp_number || null,
            account_manager_name: form.account_manager_name || null,
            account_manager_whatsapp: form.account_manager_whatsapp || null,
            booking_link: form.booking_link || null,
          })
          if (r5.error) errs.push(r5.error)
          if (errs.length) fb(`Error: ${errs.join(' | ')}`)
          else fb('✓ Guardado')
        })}
        className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-5 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
      >
        {isPending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}

// ── Creator Crecimiento sub-tab ────────────────────────────────────────────

function CreatorCrecimiento({ creator, products, startTransition, isPending, fb }: {
  creator: Creator
  products: Product[]
  startTransition: (cb: () => void) => void
  isPending: boolean
  fb: (msg: string) => void
}) {
  const [stats, setStats] = useState<CreatorMonthlyStats[]>([])
  const [videos, setVideos] = useState<CreatorVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [editingMonth, setEditingMonth] = useState<string | null>(null)
  const [statForm, setStatForm] = useState({ month: '', gmv: '', gmv_projection: '', commission_rate: '', videos_posted: '', live_hours: '', commissions_earned: '', notes: '' })
  const [showAddStat, setShowAddStat] = useState(false)
  const [showAddVideo, setShowAddVideo] = useState(false)
  const [videoForm, setVideoForm] = useState({ tiktok_url: '', product_id: '', converted: false, gmv_generated: '' })
  const [reloadKey, setReloadKey] = useState(0)

  const reload = () => setReloadKey((k) => k + 1)

  useState(() => { /* init noop */ })

  // Load bundle on creator change
  if (typeof window !== 'undefined' && creator) {
    // use effect via custom impl
  }

  // Use a real effect
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCreatorAdminBundle(creator.id).then((r) => {
      if (cancelled) return
      if (r.error) { fb(`Error: ${r.error}`); setLoading(false); return }
      setStats((r.monthlyStats ?? []) as unknown as CreatorMonthlyStats[])
      setVideos((r.videos ?? []) as unknown as CreatorVideo[])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [creator.id, reloadKey, fb])

  // Suggested projection = avg of last 3 months gmv
  const suggested = (() => {
    const last3 = stats.slice(0, 3)
    if (!last3.length) return 0
    return Math.round(last3.reduce((s, x) => s + Number(x.gmv ?? 0), 0) / last3.length)
  })()

  function startEdit(s: CreatorMonthlyStats | null) {
    if (s) {
      setEditingMonth(s.month)
      setStatForm({
        month: s.month.slice(0, 7),
        gmv: String(s.gmv ?? ''),
        gmv_projection: String(s.gmv_projection ?? ''),
        commission_rate: String(s.commission_rate ?? ''),
        videos_posted: String(s.videos_posted ?? ''),
        live_hours: String(s.live_hours ?? ''),
        commissions_earned: String(s.commissions_earned ?? ''),
        notes: s.notes ?? '',
      })
      setShowAddStat(true)
    } else {
      const now = new Date()
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      setEditingMonth(null)
      setStatForm({ month: monthStr, gmv: '', gmv_projection: String(suggested), commission_rate: '', videos_posted: '', live_hours: '', commissions_earned: '', notes: '' })
      setShowAddStat(true)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-dm-sans font-bold text-sm text-brand-black">Stats por mes</h3>
          <button onClick={() => startEdit(null)} className="text-xs font-semibold bg-brand-black text-white px-3 py-1.5 rounded-lg hover:bg-brand-black/80 transition">+ Agregar mes</button>
        </div>

        {showAddStat && (
          <div className="bg-brand-light-pink/40 border border-brand-pink/20 rounded-xl p-3 mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Mes</label><input type="month" value={statForm.month} onChange={(e) => setStatForm((f) => ({ ...f, month: e.target.value }))} className="input-field w-full text-xs" /></div>
            <div><label className="text-[10px] font-semibold text-gray-500 block mb-0.5">GMV</label><input type="number" value={statForm.gmv} onChange={(e) => setStatForm((f) => ({ ...f, gmv: e.target.value }))} className="input-field w-full text-xs" /></div>
            <div><label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Proyección {suggested ? `(sug. ${suggested})` : ''}</label><input type="number" value={statForm.gmv_projection} onChange={(e) => setStatForm((f) => ({ ...f, gmv_projection: e.target.value }))} className="input-field w-full text-xs" /></div>
            <div><label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Comisión %</label><input type="number" step="0.1" value={statForm.commission_rate} onChange={(e) => setStatForm((f) => ({ ...f, commission_rate: e.target.value }))} className="input-field w-full text-xs" /></div>
            <div><label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Videos</label><input type="number" value={statForm.videos_posted} onChange={(e) => setStatForm((f) => ({ ...f, videos_posted: e.target.value }))} className="input-field w-full text-xs" /></div>
            <div><label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Horas live</label><input type="number" step="0.5" value={statForm.live_hours} onChange={(e) => setStatForm((f) => ({ ...f, live_hours: e.target.value }))} className="input-field w-full text-xs" /></div>
            <div><label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Comisiones $</label><input type="number" value={statForm.commissions_earned} onChange={(e) => setStatForm((f) => ({ ...f, commissions_earned: e.target.value }))} className="input-field w-full text-xs" /></div>
            <div className="col-span-2 sm:col-span-4"><label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Notas</label><textarea rows={2} value={statForm.notes} onChange={(e) => setStatForm((f) => ({ ...f, notes: e.target.value }))} className="input-field w-full text-xs resize-none" /></div>
            <div className="col-span-2 sm:col-span-4 flex gap-2">
              <button
                disabled={isPending || !statForm.month}
                onClick={() => startTransition(async () => {
                  const r = await upsertCreatorMonthlyStats({
                    creator_id: creator.id,
                    month: `${statForm.month}-01`,
                    gmv: parseFloat(statForm.gmv) || 0,
                    gmv_projection: parseFloat(statForm.gmv_projection) || 0,
                    commission_rate: parseFloat(statForm.commission_rate) || 0,
                    videos_posted: parseInt(statForm.videos_posted, 10) || 0,
                    live_hours: parseFloat(statForm.live_hours) || 0,
                    commissions_earned: parseFloat(statForm.commissions_earned) || 0,
                    notes: statForm.notes || null,
                  })
                  if (r.error) fb(`Error: ${r.error}`)
                  else { fb('✓ Mes guardado'); setShowAddStat(false); reload() }
                })}
                className="text-xs font-semibold bg-brand-green text-white px-3 py-1.5 rounded-lg hover:bg-brand-green/90 transition disabled:opacity-50"
              >Guardar</button>
              <button onClick={() => setShowAddStat(false)} className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg">Cancelar</button>
              {editingMonth && (
                <button
                  disabled={isPending}
                  onClick={() => {
                    if (!confirm('¿Eliminar este mes?')) return
                    const target = stats.find((s) => s.month === editingMonth)
                    if (!target) return
                    startTransition(async () => {
                      const r = await deleteCreatorMonthlyStats(target.id)
                      if (r.error) fb(`Error: ${r.error}`)
                      else { fb('✓ Mes eliminado'); setShowAddStat(false); reload() }
                    })
                  }}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg ml-auto"
                >Eliminar</button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-xs text-gray-400 py-4 text-center">Cargando…</p>
        ) : stats.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">Aún no hay stats. Agrega un mes para empezar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-dm-sans">
              <thead className="bg-gray-50">
                <tr>
                  {['Mes', 'GMV', 'Proyección', '% met', 'Comisión %', 'Videos', 'Live h', 'Comisiones $', 'Notas', ''].map((h) => (
                    <th key={h} className="px-2 py-2 text-left text-[10px] text-gray-500 font-semibold uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.map((s) => {
                  const proj = Number(s.gmv_projection) || 0
                  const pct = proj > 0 ? Math.round((Number(s.gmv) / proj) * 100) : null
                  const alert = pct != null && pct < 70
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="px-2 py-2 font-semibold text-brand-black">{s.month.slice(0, 7)}</td>
                      <td className="px-2 py-2">${Number(s.gmv).toLocaleString('en-US')}</td>
                      <td className="px-2 py-2 text-gray-500">${proj.toLocaleString('en-US')}</td>
                      <td className="px-2 py-2">{pct != null ? <span className={alert ? 'text-red-600 font-semibold' : 'text-emerald-700 font-semibold'}>{pct}%{alert && ' ⚠️'}</span> : '—'}</td>
                      <td className="px-2 py-2">{Number(s.commission_rate)}%</td>
                      <td className="px-2 py-2">{s.videos_posted}</td>
                      <td className="px-2 py-2">{Number(s.live_hours)}h</td>
                      <td className="px-2 py-2">${Number(s.commissions_earned).toLocaleString('en-US')}</td>
                      <td className="px-2 py-2 text-gray-400 max-w-[160px] truncate">{s.notes ?? '—'}</td>
                      <td className="px-2 py-2"><button onClick={() => startEdit(s)} className="text-xs text-brand-green hover:underline">Editar</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-dm-sans font-bold text-sm text-brand-black">Conversión de videos</h3>
          <button onClick={() => setShowAddVideo(!showAddVideo)} className="text-xs font-semibold bg-brand-black text-white px-3 py-1.5 rounded-lg hover:bg-brand-black/80 transition">{showAddVideo ? 'Cancelar' : '+ Agregar video'}</button>
        </div>

        {showAddVideo && (
          <div className="bg-brand-light-pink/40 border border-brand-pink/20 rounded-xl p-3 mb-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-2"><label className="text-[10px] font-semibold text-gray-500 block mb-0.5">TikTok URL</label><input type="url" value={videoForm.tiktok_url} onChange={(e) => setVideoForm((f) => ({ ...f, tiktok_url: e.target.value }))} placeholder="https://www.tiktok.com/..." className="input-field w-full text-xs" /></div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Producto</label>
              <select value={videoForm.product_id} onChange={(e) => setVideoForm((f) => ({ ...f, product_id: e.target.value }))} className="input-field w-full text-xs">
                <option value="">Sin producto</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">GMV generado $</label>
              <input type="number" value={videoForm.gmv_generated} onChange={(e) => setVideoForm((f) => ({ ...f, gmv_generated: e.target.value }))} className="input-field w-full text-xs" />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-700 sm:col-span-2"><input type="checkbox" checked={videoForm.converted} onChange={(e) => setVideoForm((f) => ({ ...f, converted: e.target.checked }))} className="rounded" />Convertido</label>
            <div className="sm:col-span-4 flex gap-2">
              <button
                disabled={isPending || !videoForm.tiktok_url}
                onClick={() => startTransition(async () => {
                  const r = await addCreatorVideo({
                    creator_id: creator.id,
                    product_id: videoForm.product_id || null,
                    tiktok_url: videoForm.tiktok_url,
                    converted: videoForm.converted,
                    gmv_generated: parseFloat(videoForm.gmv_generated) || 0,
                  })
                  if (r.error) fb(`Error: ${r.error}`)
                  else { fb('✓ Video agregado'); setVideoForm({ tiktok_url: '', product_id: '', converted: false, gmv_generated: '' }); setShowAddVideo(false); reload() }
                })}
                className="text-xs font-semibold bg-brand-green text-white px-3 py-1.5 rounded-lg hover:bg-brand-green/90 transition disabled:opacity-50"
              >Guardar video</button>
            </div>
          </div>
        )}

        {videos.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">Aún no hay videos rastreados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-dm-sans">
              <thead className="bg-gray-50">
                <tr>
                  {['URL', 'Producto', 'Estado', 'GMV', 'Fecha', ''].map((h) => (
                    <th key={h} className="px-2 py-2 text-left text-[10px] text-gray-500 font-semibold uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {videos.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/50">
                    <td className="px-2 py-2"><a href={v.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline truncate inline-block max-w-[220px]">{v.tiktok_url}</a></td>
                    <td className="px-2 py-2 text-gray-500">{v.product?.name ?? '—'}</td>
                    <td className="px-2 py-2"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${v.converted ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{v.converted ? 'Convertido' : 'Sin conversión'}</span></td>
                    <td className="px-2 py-2">${Number(v.gmv_generated).toLocaleString('en-US')}</td>
                    <td className="px-2 py-2 text-gray-400">{new Date(v.created_at).toLocaleDateString('es')}</td>
                    <td className="px-2 py-2">
                      <button
                        disabled={isPending}
                        onClick={() => {
                          if (!confirm('¿Eliminar este video?')) return
                          startTransition(async () => {
                            const r = await deleteCreatorVideo(v.id)
                            if (r.error) fb(`Error: ${r.error}`)
                            else { fb('✓ Video eliminado'); reload() }
                          })
                        }}
                        className="text-xs text-red-400 hover:text-red-600"
                      >×</button>
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

// ── Creator To Do sub-tab ──────────────────────────────────────────────────

function CreatorTodo({ creator, startTransition, isPending, fb }: {
  creator: Creator
  startTransition: (cb: () => void) => void
  isPending: boolean
  fb: (msg: string) => void
}) {
  const [items, setItems] = useState<DeliverableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ brand_name: '', deliverable_type: 'video', due_date: '', notes: '' })
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCreatorAdminBundle(creator.id).then((r) => {
      if (cancelled) return
      if (r.error) { fb(`Error: ${r.error}`); setLoading(false); return }
      setItems((r.deliverables ?? []) as unknown as DeliverableRow[])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [creator.id, reloadKey, fb])

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-dm-sans font-bold text-sm text-brand-black">Entregas pendientes</h3>
          <button onClick={() => setShowAdd(!showAdd)} className="text-xs font-semibold bg-brand-black text-white px-3 py-1.5 rounded-lg hover:bg-brand-black/80 transition">{showAdd ? 'Cancelar' : '+ Agregar entrega'}</button>
        </div>

        {showAdd && (
          <div className="bg-brand-light-pink/40 border border-brand-pink/20 rounded-xl p-3 mb-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div><label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Marca</label><input value={form.brand_name} onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))} className="input-field w-full text-xs" /></div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Tipo</label>
              <select value={form.deliverable_type} onChange={(e) => setForm((f) => ({ ...f, deliverable_type: e.target.value }))} className="input-field w-full text-xs">
                <option value="video">Video</option>
                <option value="live">Live</option>
                <option value="post">Post</option>
              </select>
            </div>
            <div><label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Fecha entrega</label><input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} className="input-field w-full text-xs" /></div>
            <div><label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Notas</label><input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="input-field w-full text-xs" /></div>
            <div className="sm:col-span-4"><button
              disabled={isPending || !form.brand_name}
              onClick={() => startTransition(async () => {
                const r = await addDeliverable({ creator_id: creator.id, brand_name: form.brand_name, deliverable_type: form.deliverable_type, due_date: form.due_date || null, notes: form.notes || null })
                if (r.error) fb(`Error: ${r.error}`)
                else { fb('✓ Entrega creada'); setForm({ brand_name: '', deliverable_type: 'video', due_date: '', notes: '' }); setShowAdd(false); reload() }
              })}
              className="text-xs font-semibold bg-brand-green text-white px-3 py-1.5 rounded-lg hover:bg-brand-green/90 transition disabled:opacity-50"
            >Guardar</button></div>
          </div>
        )}

        {loading ? (
          <p className="text-xs text-gray-400 py-4 text-center">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">Sin entregas asignadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-dm-sans">
              <thead className="bg-gray-50">
                <tr>{['Marca', 'Tipo', 'Fecha', 'Estado', 'Notas', ''].map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-[10px] text-gray-500 font-semibold uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((d) => (
                  <tr key={d.id}>
                    <td className="px-2 py-2 font-semibold text-brand-black">{d.brand_name}</td>
                    <td className="px-2 py-2 text-gray-500">{d.deliverable_type}</td>
                    <td className="px-2 py-2 text-gray-500">{d.due_date ? new Date(d.due_date).toLocaleDateString('es') : '—'}</td>
                    <td className="px-2 py-2">
                      <select
                        value={d.status}
                        disabled={isPending}
                        onChange={(e) => startTransition(async () => {
                          const r = await updateDeliverableStatus(d.id, e.target.value)
                          if (r.error) fb(`Error: ${r.error}`)
                          else { fb('✓ Estado actualizado'); reload() }
                        })}
                        className="text-xs bg-gray-100 rounded-lg px-2 py-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="delivered">Delivered</option>
                        <option value="approved">Approved</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 text-gray-400 max-w-[200px] truncate">{d.notes ?? '—'}</td>
                    <td className="px-2 py-2">
                      <button
                        disabled={isPending}
                        onClick={() => {
                          if (!confirm('¿Eliminar entrega?')) return
                          startTransition(async () => { await deleteDeliverable(d.id); fb('✓ Eliminada'); reload() })
                        }}
                        className="text-xs text-red-400 hover:text-red-600"
                      >×</button>
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

// ── Creator Calls sub-tab ──────────────────────────────────────────────────

function CreatorCalls({ creator, startTransition, isPending, fb }: {
  creator: Creator
  startTransition: (cb: () => void) => void
  isPending: boolean
  fb: (msg: string) => void
}) {
  const [bookingLink, setBookingLink] = useState(creator.booking_link ?? '')
  const [notes, setNotes] = useState<CallNote[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [callDate, setCallDate] = useState(new Date().toISOString().split('T')[0])
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCreatorAdminBundle(creator.id).then((r) => {
      if (cancelled) return
      if (r.error) { fb(`Error: ${r.error}`); setLoading(false); return }
      setNotes((r.callNotes ?? []) as unknown as CallNote[])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [creator.id, reloadKey, fb])

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
        <h3 className="font-dm-sans font-bold text-sm text-brand-black">Booking link</h3>
        <div className="flex gap-2">
          <input type="url" value={bookingLink} onChange={(e) => setBookingLink(e.target.value)} placeholder="https://calendar.app.google/..." className="input-field flex-1 text-sm" />
          <button
            disabled={isPending}
            onClick={() => startTransition(async () => {
              const r = await updateCreatorEliteSettings(creator.id, { booking_link: bookingLink || null })
              if (r.error) fb(`Error: ${r.error}`)
              else fb('✓ Booking link guardado')
            })}
            className="text-xs font-semibold bg-brand-green text-white px-4 py-2 rounded-lg hover:bg-brand-green/90 transition disabled:opacity-50"
          >Guardar</button>
        </div>
        <p className="font-dm-sans text-xs text-gray-400">
          Las calls por mes se configuran globalmente por nivel en la pestaña Settings.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
        <h3 className="font-dm-sans font-bold text-sm text-brand-black">Notas de calls</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)} className="input-field text-sm" />
          <textarea rows={2} value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Nota de la call…" className="input-field text-sm sm:col-span-3 resize-none" />
        </div>
        <button
          disabled={isPending || !newNote.trim()}
          onClick={() => startTransition(async () => {
            const r = await addCallNote({ creator_id: creator.id, note: newNote, call_date: callDate })
            if (r.error) fb(`Error: ${r.error}`)
            else { fb('✓ Nota guardada'); setNewNote(''); reload() }
          })}
          className="text-xs font-semibold bg-brand-green text-white px-4 py-2 rounded-lg hover:bg-brand-green/90 transition disabled:opacity-50"
        >Agregar nota</button>

        {loading ? (
          <p className="text-xs text-gray-400 py-4 text-center">Cargando…</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">Aún no hay notas de calls.</p>
        ) : (
          <ul className="space-y-2 mt-3">
            {notes.map((n) => (
              <li key={n.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-400">{new Date(n.call_date).toLocaleDateString('es')}</p>
                  <p className="text-sm text-brand-black mt-1 whitespace-pre-line">{n.note}</p>
                </div>
                <button
                  disabled={isPending}
                  onClick={() => {
                    if (!confirm('¿Eliminar nota?')) return
                    startTransition(async () => {
                      const r = await deleteCallNote(n.id)
                      if (r.error) fb(`Error: ${r.error}`)
                      else { fb('✓ Nota eliminada'); reload() }
                    })
                  }}
                  className="text-xs text-red-400 hover:text-red-600 shrink-0"
                >×</button>
              </li>
            ))}
          </ul>
        )}
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
    is_exclusive: false, image_url: '', product_link: '', showcase_link: '', sample_link: '', tags: [] as string[],
    star_rating: '', review_count: '', units_sold: '',
  })
  const [editForm, setEditForm] = useState<Partial<{
    name: string; commission_rate: number; conversion_rate: number
    niche: string; is_exclusive: boolean; image_url: string | null; product_link: string | null; showcase_link: string | null; sample_link: string | null; tags: string[]
    star_rating: number | null; review_count: number | null; units_sold: number | null
  }>>({})
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  function fb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 4000) }

  async function handleImageUpload(file: File, target: 'add' | 'edit') {
    setUploading(true)
    try {
      const url = await uploadToStorage('product-images', file)
      if (target === 'add') setForm((f) => ({ ...f, image_url: url }))
      else setEditForm((f) => ({ ...f, image_url: url }))
    } catch (err) {
      fb(`Error: ${err instanceof Error ? err.message : 'Upload failed'}`)
    }
    setUploading(false)
  }

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

  async function handleSync() {
    setIsSyncing(true)
    setSyncStatus(null)
    try {
      const res = await fetch('/api/sync-products')
      const data = await res.json()
      if (data.success) setSyncStatus(`Synced ${data.count} products successfully.`)
      else setSyncStatus(`Error: ${data.error}`)
    } catch (err) {
      setSyncStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">Products</h2>
        <div className="flex items-center gap-3">
          <button
            disabled={isSyncing}
            onClick={handleSync}
            className="font-dm-sans text-sm font-semibold bg-brand-black text-white px-4 py-2 rounded-xl hover:bg-brand-black/80 transition disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync now'}
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition">
            {showAdd ? 'Cancel' : '+ Add product'}
          </button>
        </div>
      </div>

      {syncStatus && (
        <p className={`font-dm-sans text-sm mb-4 px-3 py-2 rounded-lg ${syncStatus.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
          {syncStatus}
        </p>
      )}

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
            <input placeholder="Niche (e.g. Beauty)" value={form.niche} onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))} className="input-field" />
            <div>
              <label className="font-dm-sans text-xs font-semibold text-gray-500 mb-1 block">Product Image</label>
              <input type="file" accept="image/*" disabled={uploading} onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'add') }} className="input-field w-full text-xs" />
            </div>
            <input placeholder="Product link" value={form.product_link} onChange={(e) => setForm((f) => ({ ...f, product_link: e.target.value }))} className="input-field" />
            <input placeholder="Showcase link (https://...)" value={form.showcase_link} onChange={(e) => setForm((f) => ({ ...f, showcase_link: e.target.value }))} className="input-field" />
            <input placeholder="Sample request link (https://...)" value={form.sample_link} onChange={(e) => setForm((f) => ({ ...f, sample_link: e.target.value }))} className="input-field" />
            <div>
              <label className="font-dm-sans text-xs font-semibold text-gray-500 mb-1 block">Calificación (estrellas)</label>
              <input type="number" min="0" max="5" step="0.1" placeholder="ej. 4.6" value={form.star_rating} onChange={(e) => setForm((f) => ({ ...f, star_rating: e.target.value }))} className="input-field w-full" />
            </div>
            <div>
              <label className="font-dm-sans text-xs font-semibold text-gray-500 mb-1 block"># de reseñas</label>
              <input type="number" min="0" step="1" placeholder="ej. 108" value={form.review_count} onChange={(e) => setForm((f) => ({ ...f, review_count: e.target.value }))} className="input-field w-full" />
            </div>
            <div>
              <label className="font-dm-sans text-xs font-semibold text-gray-500 mb-1 block">Unidades vendidas</label>
              <input type="number" min="0" step="1" placeholder="ej. 9548" value={form.units_sold} onChange={(e) => setForm((f) => ({ ...f, units_sold: e.target.value }))} className="input-field w-full" />
            </div>
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
            disabled={isPending || !form.name || uploading}
            onClick={() => startTransition(async () => {
              const r = await addProduct({
                name: form.name,
                commission_rate: parseFloat(form.commission_rate) || 0,
                conversion_rate: parseFloat(form.conversion_rate) || 0,
                is_exclusive: form.is_exclusive,
                niche: form.niche,
                image_url: form.image_url || null,
                product_link: form.product_link || null,
                showcase_link: form.showcase_link || null,
                sample_link: form.sample_link || null,
                tags: form.tags,
                star_rating: form.star_rating === '' ? null : parseFloat(form.star_rating),
                review_count: form.review_count === '' ? null : parseInt(form.review_count, 10),
                units_sold: form.units_sold === '' ? null : parseInt(form.units_sold, 10),
              })
              if (r.error) fb(`Error: ${r.error}`)
              else {
                fb('✓ Product added')
                setForm({ name: '', commission_rate: '', conversion_rate: '', niche: '', is_exclusive: false, image_url: '', product_link: '', showcase_link: '', sample_link: '', tags: [], star_rating: '', review_count: '', units_sold: '' })
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
                          showcase_link: p.showcase_link ?? '',
                          sample_link: p.sample_link ?? '',
                          tags: p.tags ?? [],
                          star_rating: p.star_rating,
                          review_count: p.review_count,
                          units_sold: p.units_sold,
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
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Niche</p>
                        <input value={editForm.niche ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, niche: e.target.value }))} className="input-field w-full" />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Product Image</p>
                        <input type="file" accept="image/*" disabled={uploading} onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'edit') }} className="input-field w-full text-xs" />
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
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Showcase Link</p>
                        <input value={editForm.showcase_link ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, showcase_link: e.target.value }))} className="input-field w-full" placeholder="https://..." />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Sample Request Link</p>
                        <input value={editForm.sample_link ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, sample_link: e.target.value }))} className="input-field w-full" placeholder="https://..." />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Calificación (estrellas)</p>
                        <input type="number" min="0" max="5" step="0.1" value={editForm.star_rating ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, star_rating: e.target.value === '' ? null : parseFloat(e.target.value) }))} className="input-field w-full" placeholder="ej. 4.6" />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1"># de reseñas</p>
                        <input type="number" min="0" step="1" value={editForm.review_count ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, review_count: e.target.value === '' ? null : parseInt(e.target.value, 10) }))} className="input-field w-full" placeholder="ej. 108" />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Unidades vendidas</p>
                        <input type="number" min="0" step="1" value={editForm.units_sold ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, units_sold: e.target.value === '' ? null : parseInt(e.target.value, 10) }))} className="input-field w-full" placeholder="ej. 9548" />
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
                      disabled={isPending || uploading}
                      onClick={() => startTransition(async () => {
                        const payload = { ...editForm, image_url: (editForm.image_url as string) || null, product_link: (editForm.product_link as string) || null, showcase_link: (editForm.showcase_link as string) || null, sample_link: (editForm.sample_link as string) || null }
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
    brand_logo_url: '', product_id: '', product_ids: [] as string[], budget: '', product_link: '', sample_available: false,
  }
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
  const [productSearch, setProductSearch] = useState('')
  const [editProductSearch, setEditProductSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleCampaignProduct(productId: string, current: string[], setter: (ids: string[]) => void) {
    setter(current.includes(productId) ? current.filter((p) => p !== productId) : [...current, productId])
  }

  async function handleLogoUpload(file: File, target: 'add' | 'edit') {
    setUploading(true)
    try {
      const url = await uploadToStorage('campaign-assets', file)
      if (target === 'add') setForm((f) => ({ ...f, brand_logo_url: url }))
      else setEditForm((f) => ({ ...f, brand_logo_url: url }))
    } catch (err) {
      fb(`Error: ${err instanceof Error ? err.message : 'Upload failed'}`)
    }
    setUploading(false)
  }

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
            <div>
              <label className="font-dm-sans text-xs font-semibold text-gray-500 mb-1 block">Brand Logo</label>
              <input type="file" accept="image/*" disabled={uploading} onChange={(e) => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0], 'add') }} className="input-field w-full text-xs" />
            </div>
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

          {/* Linked products multi-select */}
          <div className="mt-4">
            <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-2">Productos vinculados</p>
            {form.product_ids.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.product_ids.map((pid) => {
                  const p = products.find((x) => x.id === pid)
                  return (
                    <span key={pid} className="inline-flex items-center gap-1.5 text-xs font-medium bg-brand-green/10 text-brand-green px-2.5 py-1 rounded-full">
                      {p?.name || pid}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, product_ids: f.product_ids.filter((id) => id !== pid) }))}
                        className="hover:text-red-600 leading-none"
                      >×</button>
                    </span>
                  )
                })}
              </div>
            )}
            <input
              type="text"
              placeholder="Buscar productos para agregar..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="input-field w-full"
            />
            {productSearch && (
              <div className="mt-1 max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-xl divide-y divide-gray-50">
                {products
                  .filter((p) => !form.product_ids.includes(p.id) && p.name.toLowerCase().includes(productSearch.toLowerCase()))
                  .slice(0, 10)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        toggleCampaignProduct(p.id, form.product_ids, (ids) => setForm((f) => ({ ...f, product_ids: ids })))
                        setProductSearch('')
                      }}
                      className="w-full text-left px-3 py-2 text-sm font-dm-sans hover:bg-brand-light-pink transition"
                    >
                      {p.name} <span className="text-xs text-gray-400">{p.commission_rate}%</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <button
            disabled={isPending || !form.brand_name || uploading}
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
                product_id: form.product_ids[0] || null,
                product_ids: form.product_ids,
                budget: parseFloat(form.budget) || null,
                product_link: form.product_link || null,
                sample_available: form.sample_available,
              })
              if (r.error) fb(`Error: ${r.error}`)
              else {
                fb('✓ Campaign created')
                setForm({ brand_name: '', description: '', commission_rate: '', spots_left: '', deadline: '', min_level: 'Initiation', target_levels: [], status: 'active', brand_logo_url: '', product_id: '', product_ids: [], budget: '', product_link: '', sample_available: false })
                setProductSearch('')
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
                            product_ids: (c.campaign_products ?? []).map((cp) => cp.product_id),
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
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Brand Logo</p>
                        <input type="file" accept="image/*" disabled={uploading} onChange={(e) => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0], 'edit') }} className="input-field w-full text-xs" />
                        {editForm.brand_logo_url && (
                          <img src={editForm.brand_logo_url} alt="Logo" className="h-8 object-contain rounded border border-gray-200 bg-white px-2 py-0.5 mt-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        )}
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Productos vinculados</p>
                        {editForm.product_ids.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {editForm.product_ids.map((pid) => {
                              const p = products.find((x) => x.id === pid)
                              return (
                                <span key={pid} className="inline-flex items-center gap-1.5 text-xs font-medium bg-brand-green/10 text-brand-green px-2.5 py-1 rounded-full">
                                  {p?.name || pid}
                                  <button
                                    type="button"
                                    onClick={() => setEditForm((f) => ({ ...f, product_ids: f.product_ids.filter((id) => id !== pid) }))}
                                    className="hover:text-red-600 leading-none"
                                  >×</button>
                                </span>
                              )
                            })}
                          </div>
                        )}
                        <input
                          type="text"
                          placeholder="Buscar productos para agregar..."
                          value={editProductSearch}
                          onChange={(e) => setEditProductSearch(e.target.value)}
                          className="input-field w-full"
                        />
                        {editProductSearch && (
                          <div className="mt-1 max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-xl divide-y divide-gray-50">
                            {products
                              .filter((p) => !editForm.product_ids.includes(p.id) && p.name.toLowerCase().includes(editProductSearch.toLowerCase()))
                              .slice(0, 10)
                              .map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    toggleCampaignProduct(p.id, editForm.product_ids, (ids) => setEditForm((f) => ({ ...f, product_ids: ids })))
                                    setEditProductSearch('')
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm font-dm-sans hover:bg-brand-light-pink transition"
                                >
                                  {p.name} <span className="text-xs text-gray-400">{p.commission_rate}%</span>
                                </button>
                              ))}
                          </div>
                        )}
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
                      disabled={isPending || !editForm.brand_name || uploading}
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
                          product_id: editForm.product_ids[0] || null,
                          product_ids: editForm.product_ids,
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
function SettingsTab({ settings }: { settings: SiteSettings | null }) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [bookingForm, setBookingForm] = useState({
    calls_per_month_initiation: settings?.calls_per_month_initiation ?? 0,
    calls_per_month_foundation: settings?.calls_per_month_foundation ?? 0,
    calls_per_month_growth: settings?.calls_per_month_growth ?? 1,
    calls_per_month_scale: settings?.calls_per_month_scale ?? 2,
    calls_per_month_elite: settings?.calls_per_month_elite ?? 4,
    booking_link_initiation: settings?.booking_link_initiation ?? '',
    booking_link_foundation: settings?.booking_link_foundation ?? '',
    booking_link_growth: settings?.booking_link_growth ?? '',
    booking_link_scale: settings?.booking_link_scale ?? '',
    booking_link_elite: settings?.booking_link_elite ?? 'https://calendar.app.google/bW5ZsKF9wbDrLVF6A',
    google_sheets_url: settings?.google_sheets_url ?? '',
  })
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const hackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/hack`
    : '/hack'

  function fb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 4000) }

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

      {/* 1:1 Booking Settings */}
      <div>
        <h2 className="font-dm-sans font-bold text-lg text-brand-black mb-4">Llamadas 1:1 — Booking</h2>
        <Feedback msg={feedback} />

        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-5">
          <div>
            <h3 className="font-dm-sans font-semibold text-sm text-brand-black mb-3">Llamadas por mes por nivel</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(['initiation', 'foundation', 'growth', 'scale', 'elite'] as const).map((lvl) => {
                const key = `calls_per_month_${lvl}` as keyof typeof bookingForm
                return (
                  <div key={lvl}>
                    <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{lvl}</label>
                    <input
                      type="number"
                      min="0"
                      value={bookingForm[key]}
                      onChange={(e) => setBookingForm((f) => ({ ...f, [key]: parseInt(e.target.value) || 0 }))}
                      className="input-field w-full"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="font-dm-sans font-semibold text-sm text-brand-black mb-3">Booking link por defecto por nivel</h3>
            <div className="space-y-3">
              <div>
                <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Initiation</label>
                <input
                  type="url"
                  value={bookingForm.booking_link_initiation}
                  onChange={(e) => setBookingForm((f) => ({ ...f, booking_link_initiation: e.target.value }))}
                  placeholder="https://calendar.app.google/..."
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Foundation</label>
                <input
                  type="url"
                  value={bookingForm.booking_link_foundation}
                  onChange={(e) => setBookingForm((f) => ({ ...f, booking_link_foundation: e.target.value }))}
                  placeholder="https://calendar.app.google/..."
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Growth</label>
                <input
                  type="url"
                  value={bookingForm.booking_link_growth}
                  onChange={(e) => setBookingForm((f) => ({ ...f, booking_link_growth: e.target.value }))}
                  placeholder="https://calendar.app.google/..."
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Scale</label>
                <input
                  type="url"
                  value={bookingForm.booking_link_scale}
                  onChange={(e) => setBookingForm((f) => ({ ...f, booking_link_scale: e.target.value }))}
                  placeholder="https://calendar.app.google/..."
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Elite</label>
                <input
                  type="url"
                  value={bookingForm.booking_link_elite}
                  onChange={(e) => setBookingForm((f) => ({ ...f, booking_link_elite: e.target.value }))}
                  placeholder="https://calendar.app.google/..."
                  className="input-field w-full"
                />
              </div>
            </div>
          </div>

          <button
            disabled={isPending}
            onClick={() => startTransition(async () => {
              const r = await updateSettings({
                calls_per_month_initiation: bookingForm.calls_per_month_initiation,
                calls_per_month_foundation: bookingForm.calls_per_month_foundation,
                calls_per_month_growth: bookingForm.calls_per_month_growth,
                calls_per_month_scale: bookingForm.calls_per_month_scale,
                calls_per_month_elite: bookingForm.calls_per_month_elite,
                booking_link_initiation: bookingForm.booking_link_initiation || null,
                booking_link_foundation: bookingForm.booking_link_foundation || null,
                booking_link_growth: bookingForm.booking_link_growth || null,
                booking_link_scale: bookingForm.booking_link_scale || null,
                booking_link_elite: bookingForm.booking_link_elite || null,
                google_sheets_url: bookingForm.google_sheets_url || null,
              })
              if (r.error) fb(`Error: ${r.error}`)
              else fb('✓ Booking settings saved!')
            })}
            className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-6 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save booking settings'}
          </button>
        </div>
      </div>

      {/* Google Sheets Product Sync */}
      <div>
        <h2 className="font-dm-sans font-bold text-lg text-brand-black mb-4">Google Sheets Product Sync</h2>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
          <div>
            <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Google Sheets URL</label>
            <input
              type="url"
              value={bookingForm.google_sheets_url}
              onChange={(e) => setBookingForm((f) => ({ ...f, google_sheets_url: e.target.value }))}
              placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
              className="input-field w-full"
            />
            <p className="font-dm-sans text-xs text-gray-400 mt-1">
              Use a published CSV URL from Google Sheets (File &gt; Share &gt; Publish to web &gt; CSV).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={isSyncing}
              onClick={async () => {
                setIsSyncing(true)
                setSyncStatus(null)
                try {
                  // Save the URL first
                  await updateSettings({ google_sheets_url: bookingForm.google_sheets_url || null })
                  const res = await fetch('/api/sync-products')
                  const data = await res.json()
                  if (data.success) {
                    setSyncStatus(`Synced ${data.count} products successfully.`)
                  } else {
                    setSyncStatus(`Error: ${data.error}`)
                  }
                } catch (err) {
                  setSyncStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
                } finally {
                  setIsSyncing(false)
                }
              }}
              className="font-dm-sans text-sm font-semibold bg-brand-black text-white px-6 py-2.5 rounded-xl hover:bg-brand-black/80 transition disabled:opacity-50"
            >
              {isSyncing ? 'Syncing...' : 'Sync Products'}
            </button>

            {settings?.last_synced_at && (
              <span className="font-dm-sans text-xs text-gray-400">
                Last synced: {new Date(settings.last_synced_at).toLocaleString()}
              </span>
            )}
          </div>

          {syncStatus && (
            <p className={`font-dm-sans text-sm ${syncStatus.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {syncStatus}
            </p>
          )}
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

// ── Deliverables Tab ─────────────────────────────────────────────────────────
function DeliverablesTab({ deliverables, creators }: { deliverables: DeliverableRow[]; creators: Creator[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ creator_id: '', brand_name: '', deliverable_type: 'video', due_date: '', notes: '' })
  const [filterCreator, setFilterCreator] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function fb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 4000) }

  const filtered = deliverables.filter((d) => {
    if (filterCreator && d.creator_id !== filterCreator) return false
    if (filterStatus && d.status !== filterStatus) return false
    return true
  })

  const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pendiente', style: 'bg-gray-100 text-gray-600' },
    { value: 'delivered', label: 'Entregado', style: 'bg-emerald-100 text-emerald-700' },
    { value: 'approved', label: 'Aprobado', style: 'bg-emerald-200 text-emerald-800' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">Entregas</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition">
          {showAdd ? 'Cancelar' : '+ Nueva entrega'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-brand-light-pink border border-brand-pink/20 rounded-2xl p-5 mb-5">
          <h3 className="font-dm-sans font-semibold text-sm mb-3 text-brand-black">Nueva entrega</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={form.creator_id} onChange={(e) => setForm((f) => ({ ...f, creator_id: e.target.value }))} className="input-field">
              <option value="">Seleccionar creadora</option>
              {creators.map((c) => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
            </select>
            <input placeholder="Nombre de marca" value={form.brand_name} onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))} className="input-field" />
            <select value={form.deliverable_type} onChange={(e) => setForm((f) => ({ ...f, deliverable_type: e.target.value }))} className="input-field">
              <option value="video">Video</option>
              <option value="live">Live</option>
              <option value="story">Story</option>
              <option value="reel">Reel</option>
              <option value="post">Post</option>
              <option value="other">Otro</option>
            </select>
            <input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} className="input-field" />
            <input placeholder="Notas (opcional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="input-field sm:col-span-2" />
          </div>
          <button
            disabled={isPending || !form.creator_id || !form.brand_name}
            onClick={() => startTransition(async () => {
              const r = await addDeliverable({
                creator_id: form.creator_id,
                brand_name: form.brand_name,
                deliverable_type: form.deliverable_type,
                due_date: form.due_date || null,
                notes: form.notes || null,
              })
              if (r.error) fb(`Error: ${r.error}`)
              else { fb('✓ Entrega creada'); setForm({ creator_id: '', brand_name: '', deliverable_type: 'video', due_date: '', notes: '' }); setShowAdd(false) }
            })}
            className="mt-3 font-dm-sans text-sm font-semibold bg-brand-green text-white px-5 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      )}

      <Feedback msg={feedback} />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={filterCreator} onChange={(e) => setFilterCreator(e.target.value)} className="input-field text-sm">
          <option value="">Todas las creadoras</option>
          {creators.map((c) => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field text-sm">
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm font-dm-sans">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Creadora', 'Marca', 'Tipo', 'Fecha', 'Estado', 'Notas', 'Acciones'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay entregas.</td></tr>
            )}
            {filtered.map((d) => {
              const statusOpt = STATUS_OPTIONS.find((s) => s.value === d.status) ?? STATUS_OPTIONS[0]
              return (
                <tr key={d.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-brand-black whitespace-nowrap">{d.creator?.name || d.creator?.email || '–'}</td>
                  <td className="px-4 py-3 text-gray-700">{d.brand_name}</td>
                  <td className="px-4 py-3 text-gray-500">{d.deliverable_type}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{d.due_date ? new Date(d.due_date + 'T12:00:00').toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '–'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={d.status}
                      disabled={isPending}
                      onChange={(e) => startTransition(async () => {
                        const r = await updateDeliverableStatus(d.id, e.target.value)
                        if (r.error) fb(`Error: ${r.error}`)
                        else fb('✓ Estado actualizado')
                      })}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${statusOpt.style}`}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{d.notes || '–'}</td>
                  <td className="px-4 py-3">
                    <button
                      disabled={isPending}
                      onClick={() => { if (confirm('¿Eliminar esta entrega?')) startTransition(async () => { await deleteDeliverable(d.id); fb('✓ Eliminada') }) }}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                    >Eliminar</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Level Config Tab ─────────────────────────────────────────────────────────
function LevelConfigTab({ levelConfigs }: { levelConfigs: LevelConfigRow[] }) {
  const [editingLevel, setEditingLevel] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<LevelConfigRow>>({})
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function fb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 4000) }

  function startEdit(lc: LevelConfigRow) {
    setEditingLevel(lc.level_name)
    setForm({ ...lc })
  }

  const isScaleOrElite = (name: string) => name === 'Scale' || name === 'Elite'
  const isElite = (name: string) => name === 'Elite'

  return (
    <div>
      <h2 className="font-dm-sans font-bold text-lg text-brand-black mb-4">Configuración por nivel</h2>
      <Feedback msg={feedback} />

      <div className="space-y-4">
        {levelConfigs.map((lc) => (
          <div key={lc.level_name} className="border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-dm-sans font-bold text-brand-black">{lc.level_name}</h3>
              <button
                onClick={() => editingLevel === lc.level_name ? setEditingLevel(null) : startEdit(lc)}
                className="font-dm-sans text-sm font-semibold text-brand-green hover:underline"
              >
                {editingLevel === lc.level_name ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            {editingLevel === lc.level_name ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div>
                    <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Videos por día</p>
                    <input type="number" value={form.videos_per_day ?? ''} onChange={(e) => setForm((f) => ({ ...f, videos_per_day: parseInt(e.target.value) || 0 }))} className="input-field w-full" />
                  </div>
                  <div>
                    <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Hero productos</p>
                    <input type="number" value={form.hero_products ?? ''} onChange={(e) => setForm((f) => ({ ...f, hero_products: parseInt(e.target.value) || 0 }))} className="input-field w-full" />
                  </div>
                  <div>
                    <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Hero videos c/u</p>
                    <input type="number" value={form.hero_videos_each ?? ''} onChange={(e) => setForm((f) => ({ ...f, hero_videos_each: parseInt(e.target.value) || 0 }))} className="input-field w-full" />
                  </div>
                  {isScaleOrElite(lc.level_name) && (
                    <>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Sub-hero productos</p>
                        <input type="number" value={form.sub_hero_products ?? ''} onChange={(e) => setForm((f) => ({ ...f, sub_hero_products: parseInt(e.target.value) || 0 }))} className="input-field w-full" />
                      </div>
                      <div>
                        <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Sub-hero videos c/u</p>
                        <input type="number" value={form.sub_hero_videos_each ?? ''} onChange={(e) => setForm((f) => ({ ...f, sub_hero_videos_each: parseInt(e.target.value) || 0 }))} className="input-field w-full" />
                      </div>
                    </>
                  )}
                  <div>
                    <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Videos complementarios</p>
                    <input type="number" value={form.complementary_videos ?? ''} onChange={(e) => setForm((f) => ({ ...f, complementary_videos: parseInt(e.target.value) || 0 }))} className="input-field w-full" />
                  </div>
                  {isElite(lc.level_name) && (
                    <div>
                      <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Videos ganadores</p>
                      <input type="number" value={form.winner_videos ?? ''} onChange={(e) => setForm((f) => ({ ...f, winner_videos: parseInt(e.target.value) || 0 }))} className="input-field w-full" />
                    </div>
                  )}
                  <div>
                    <p className="font-dm-sans text-xs font-semibold text-gray-500 mb-1">Llamadas/mes</p>
                    <input type="number" value={form.calls_per_month ?? ''} onChange={(e) => setForm((f) => ({ ...f, calls_per_month: parseInt(e.target.value) || 0 }))} className="input-field w-full" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-2">
                  <label className="flex items-center gap-2 font-dm-sans text-sm text-gray-700">
                    <input type="checkbox" checked={form.has_creative_bank ?? false} onChange={(e) => setForm((f) => ({ ...f, has_creative_bank: e.target.checked }))} className="rounded" />
                    Banco creativo
                  </label>
                  <label className="flex items-center gap-2 font-dm-sans text-sm text-gray-700">
                    <input type="checkbox" checked={form.has_deliverables_board ?? false} onChange={(e) => setForm((f) => ({ ...f, has_deliverables_board: e.target.checked }))} className="rounded" />
                    Tablero de entregas
                  </label>
                  <label className="flex items-center gap-2 font-dm-sans text-sm text-gray-700">
                    <input type="checkbox" checked={form.has_brand_pipeline ?? false} onChange={(e) => setForm((f) => ({ ...f, has_brand_pipeline: e.target.checked }))} className="rounded" />
                    Pipeline de marcas
                  </label>
                </div>
                <button
                  disabled={isPending}
                  onClick={() => startTransition(async () => {
                    const r = await updateLevelConfig(lc.level_name, form)
                    if (r.error) fb(`Error: ${r.error}`)
                    else { fb('✓ Configuración guardada'); setEditingLevel(null) }
                  })}
                  className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-5 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
                >
                  {isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-dm-sans text-sm">
                <div><span className="text-gray-400">Videos/día:</span> <span className="font-semibold">{lc.videos_per_day}</span></div>
                <div><span className="text-gray-400">Hero:</span> <span className="font-semibold">{lc.hero_products}×{lc.hero_videos_each}</span></div>
                {isScaleOrElite(lc.level_name) && <div><span className="text-gray-400">Sub-hero:</span> <span className="font-semibold">{lc.sub_hero_products}×{lc.sub_hero_videos_each}</span></div>}
                <div><span className="text-gray-400">Complementarios:</span> <span className="font-semibold">{lc.complementary_videos}</span></div>
                {isElite(lc.level_name) && <div><span className="text-gray-400">Ganadores:</span> <span className="font-semibold">{lc.winner_videos}</span></div>}
                <div><span className="text-gray-400">Llamadas:</span> <span className="font-semibold">{lc.calls_per_month}/mes</span></div>
                <div className="col-span-2 sm:col-span-4 flex flex-wrap gap-2 mt-1">
                  {lc.has_creative_bank && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">Banco creativo</span>}
                  {lc.has_deliverables_board && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Entregas</span>}
                  {lc.has_brand_pipeline && <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Pipeline</span>}
                  {lc.has_retainer && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Retainer</span>}
                </div>
              </div>
            )}
          </div>
        ))}
        {levelConfigs.length === 0 && (
          <p className="font-dm-sans text-sm text-gray-400 text-center py-8">No hay configuración de niveles. Ejecuta el SQL para crear la tabla level_config.</p>
        )}
      </div>
    </div>
  )
}

// ── Announcements Tab ────────────────────────────────────────────────────────
function AnnouncementsTab({ announcements }: { announcements: AnnouncementRow[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', image_url: '' })
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function fb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 4000) }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const result = await uploadAnnouncementImage(formData)
    setUploading(false)
    if (result.error) fb(`Error: ${result.error}`)
    else if (result.url) setForm((f) => ({ ...f, image_url: result.url! }))
  }

  function handleAdd() {
    if (!form.title.trim()) { fb('Error: Title is required'); return }
    startTransition(async () => {
      const r = await addAnnouncement({
        title: form.title,
        body: form.body || null,
        image_url: form.image_url || null,
      })
      if (r.error) fb(`Error: ${r.error}`)
      else { fb('Announcement created!'); setForm({ title: '', body: '', image_url: '' }); setShowAdd(false) }
    })
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      const r = await updateAnnouncement(id, { is_active: !isActive })
      if (r.error) fb(`Error: ${r.error}`)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteAnnouncement(id)
      fb('Announcement deleted')
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">Announcements</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition">
          {showAdd ? 'Cancel' : '+ New announcement'}
        </button>
      </div>

      <Feedback msg={feedback} />

      {showAdd && (
        <div className="bg-brand-light-pink border border-brand-pink/20 rounded-2xl p-5 mb-6 space-y-4">
          <div>
            <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Announcement title"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Body (optional)</label>
            <textarea
              rows={3}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Announcement details..."
              className="input-field w-full resize-none"
            />
          </div>
          <div>
            <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="font-dm-sans text-sm text-gray-600"
            />
            {uploading && <p className="font-dm-sans text-xs text-gray-400 mt-1">Uploading...</p>}
            {form.image_url && (
              <div className="mt-2">
                <img src={form.image_url} alt="Preview" className="w-32 h-20 object-cover rounded-lg border border-gray-200" />
              </div>
            )}
          </div>
          <button
            disabled={isPending}
            onClick={handleAdd}
            className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-6 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Create announcement'}
          </button>
        </div>
      )}

      {announcements.length === 0 ? (
        <p className="font-dm-sans text-sm text-gray-400 text-center py-8">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-dm-sans font-semibold text-sm text-brand-black">{a.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${a.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {a.body && <p className="font-dm-sans text-sm text-gray-600 mb-2">{a.body}</p>}
                  {a.image_url && (
                    <img src={a.image_url} alt="Announcement" className="w-40 h-24 object-cover rounded-lg border border-gray-200" />
                  )}
                  <p className="font-dm-sans text-xs text-gray-400 mt-2">
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(a.id, a.is_active)}
                    disabled={isPending}
                    className="font-dm-sans text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                  >
                    {a.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={isPending}
                    className="font-dm-sans text-xs text-red-500 hover:text-red-700 px-2 py-1.5"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Violations Tab ───────────────────────────────────────────────────────────
function ViolationsTab({ violations }: { violations: ViolationRow[] }) {
  const [fullScreenUrl, setFullScreenUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  function fb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 4000) }

  const statusStyles: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    in_review: { label: 'In review', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    resolved: { label: 'Resolved', color: 'text-green-700 bg-green-50 border-green-200' },
    rejected: { label: 'Rejected', color: 'text-red-700 bg-red-50 border-red-200' },
  }

  async function updateStatus(id: string, status: string) {
    startTransition(async () => {
      const res = await fetch('/api/update-violation-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) fb(`Status updated to ${status}`)
      else fb('Error updating status')
    })
  }

  return (
    <div>
      <h2 className="font-dm-sans font-bold text-lg text-brand-black mb-4">Violations</h2>
      <Feedback msg={feedback} />

      {violations.length === 0 ? (
        <p className="font-dm-sans text-sm text-gray-400 text-center py-8">No violations reported yet.</p>
      ) : (
        <div className="space-y-4">
          {violations.map((v) => {
            const style = statusStyles[v.status] ?? statusStyles.pending
            return (
              <div key={v.id} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="font-dm-sans text-sm font-semibold text-brand-black">
                      {v.creator?.name ?? v.creator?.email ?? 'Unknown'}
                    </span>
                    <span className="font-dm-sans text-xs text-gray-400 ml-2">
                      {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-dm-sans text-xs font-semibold px-2.5 py-1 rounded-full border ${style.color}`}>
                      {style.label}
                    </span>
                    <select
                      value={v.status}
                      onChange={(e) => updateStatus(v.id, e.target.value)}
                      disabled={isPending}
                      className="font-dm-sans text-xs border border-gray-200 rounded-lg px-2 py-1"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_review">In review</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <p className="font-dm-sans text-sm text-gray-700 leading-relaxed mb-3">{v.description}</p>

                {/* Screenshot thumbnails */}
                {v.screenshot_urls && v.screenshot_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {v.screenshot_urls.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setFullScreenUrl(url)}
                        className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:border-brand-pink transition group"
                      >
                        <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Full-size screenshot modal */}
      {fullScreenUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setFullScreenUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setFullScreenUrl(null)}
              className="absolute -top-10 right-0 text-white text-sm font-dm-sans hover:text-gray-300"
            >
              Close
            </button>
            <img src={fullScreenUrl} alt="Screenshot full size" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Admin Panel ──────────────────────────────────────────────────────────
// ── Papaya Picks Tab ──────────────────────────────────────────────────────────

const PICK_NICHES = ['Beauty', 'Fashion', 'Hair', 'Skincare', 'Fitness', 'Home', 'Other'] as const

function pickScoreBadge(score: number): { label: string; className: string } {
  if (score > 70) return { label: `🔥 Hot Pick · ${Math.round(score)}`, className: 'bg-emerald-100 text-emerald-700 border border-emerald-300' }
  if (score >= 50) return { label: `⭐ Good Pick · ${Math.round(score)}`, className: 'bg-amber-100 text-amber-700 border border-amber-300' }
  return { label: `${Math.round(score)}`, className: 'bg-gray-100 text-gray-600 border border-gray-200' }
}

function PapayaPicksTab({ picks }: { picks: PapayaPick[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const emptyForm = {
    product_name: '', brand_name: '', niche: 'Beauty', commission_rate: '',
    product_link: '', sample_link: '', product_image_url: '',
    units_sold_this_week: '', growth_percentage: '', affiliates_count: '', videos_count: '',
    why_its_a_pick: '', example_video_url: '',
    min_level: 'Foundation', is_active: true, expires_at: '',
  }
  const [form, setForm] = useState(emptyForm)

  function fb(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(null), 4000) }

  async function handleImage(file: File) {
    setUploading(true)
    try {
      const url = await uploadToStorage('papaya-picks', file)
      setForm((f) => ({ ...f, product_image_url: url }))
    } catch (err) {
      fb(`Error: ${err instanceof Error ? err.message : 'Upload failed'}`)
    }
    setUploading(false)
  }

  function startEdit(p: PapayaPick) {
    setEditingId(p.id)
    setForm({
      product_name: p.product_name,
      brand_name: p.brand_name ?? '',
      niche: p.niche ?? 'Beauty',
      commission_rate: String(p.commission_rate ?? ''),
      product_link: p.product_link ?? '',
      sample_link: p.sample_link ?? '',
      product_image_url: p.product_image_url ?? '',
      units_sold_this_week: String(p.units_sold_this_week ?? ''),
      growth_percentage: String(p.growth_percentage ?? ''),
      affiliates_count: String(p.affiliates_count ?? ''),
      videos_count: String(p.videos_count ?? ''),
      why_its_a_pick: p.why_its_a_pick ?? '',
      example_video_url: p.example_video_url ?? '',
      min_level: p.min_level ?? 'Foundation',
      is_active: p.is_active,
      expires_at: p.expires_at ? p.expires_at.slice(0, 10) : '',
    })
    setShowAdd(true)
  }

  function reset() {
    setForm(emptyForm); setEditingId(null); setShowAdd(false)
  }

  const liveScore = computePapayaPickScore(
    parseInt(form.units_sold_this_week, 10) || 0,
    parseFloat(form.growth_percentage) || 0,
    parseInt(form.affiliates_count, 10) || 0,
    parseInt(form.videos_count, 10) || 0,
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">🌟 Papaya Picks</h2>
        <button
          onClick={() => { if (showAdd) reset(); else setShowAdd(true) }}
          className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green/90 transition"
        >
          {showAdd ? 'Cancelar' : '+ New Papaya Pick'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-brand-light-pink/40 border border-brand-pink/20 rounded-2xl p-5 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-dm-sans font-bold text-sm text-brand-black">{editingId ? 'Editar Papaya Pick' : 'Nuevo Papaya Pick'}</h3>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${pickScoreBadge(liveScore).className}`}>
              Score: {pickScoreBadge(liveScore).label}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Nombre del producto" value={form.product_name} onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))} className="input-field text-sm sm:col-span-2" />
            <input placeholder="Marca" value={form.brand_name} onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))} className="input-field text-sm" />
            <select value={form.niche} onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))} className="input-field text-sm">
              {PICK_NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <input type="number" step="0.1" placeholder="Comisión %" value={form.commission_rate} onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))} className="input-field text-sm" />
            <select value={form.min_level} onChange={(e) => setForm((f) => ({ ...f, min_level: e.target.value }))} className="input-field text-sm">
              {LEVELS.filter((l) => l !== 'Initiation').map((l) => <option key={l} value={l}>{l}+</option>)}
            </select>
            <input placeholder="Link del producto" value={form.product_link} onChange={(e) => setForm((f) => ({ ...f, product_link: e.target.value }))} className="input-field text-sm" />
            <input placeholder="Link para muestra" value={form.sample_link} onChange={(e) => setForm((f) => ({ ...f, sample_link: e.target.value }))} className="input-field text-sm" />
            <div>
              <label className="text-[10px] font-semibold text-gray-500 block mb-1">Imagen del producto</label>
              <input type="file" accept="image/*" disabled={uploading} onChange={(e) => { if (e.target.files?.[0]) handleImage(e.target.files[0]) }} className="input-field text-xs w-full" />
              {form.product_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.product_image_url} alt="" className="w-12 h-12 object-cover rounded-lg mt-1 border border-gray-200" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Unidades vendidas (semana)</label><input type="number" value={form.units_sold_this_week} onChange={(e) => setForm((f) => ({ ...f, units_sold_this_week: e.target.value }))} className="input-field text-sm w-full" /></div>
            <div><label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Crecimiento %</label><input type="number" step="0.1" value={form.growth_percentage} onChange={(e) => setForm((f) => ({ ...f, growth_percentage: e.target.value }))} className="input-field text-sm w-full" /></div>
            <div><label className="text-[10px] font-semibold text-gray-500 block mb-0.5"># afiliadas</label><input type="number" value={form.affiliates_count} onChange={(e) => setForm((f) => ({ ...f, affiliates_count: e.target.value }))} className="input-field text-sm w-full" /></div>
            <div><label className="text-[10px] font-semibold text-gray-500 block mb-0.5"># videos en TikTok</label><input type="number" value={form.videos_count} onChange={(e) => setForm((f) => ({ ...f, videos_count: e.target.value }))} className="input-field text-sm w-full" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <textarea rows={3} placeholder='¿Por qué es un pick? (ej. "Spring campaign starting, only 12 affiliates, 244 units in 3 days")' value={form.why_its_a_pick} onChange={(e) => setForm((f) => ({ ...f, why_its_a_pick: e.target.value }))} className="input-field text-sm resize-none" />
            <div className="space-y-2">
              <input placeholder="Video TikTok de ejemplo (opcional)" value={form.example_video_url} onChange={(e) => setForm((f) => ({ ...f, example_video_url: e.target.value }))} className="input-field text-sm w-full" />
              <input type="date" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} className="input-field text-sm w-full" />
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded" />Activo</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={isPending || !form.product_name.trim() || uploading}
              onClick={() => startTransition(async () => {
                const payload = {
                  product_name: form.product_name.trim(),
                  brand_name: form.brand_name || null,
                  niche: form.niche || null,
                  commission_rate: form.commission_rate === '' ? null : parseFloat(form.commission_rate),
                  product_link: form.product_link || null,
                  sample_link: form.sample_link || null,
                  product_image_url: form.product_image_url || null,
                  units_sold_this_week: parseInt(form.units_sold_this_week, 10) || 0,
                  growth_percentage: parseFloat(form.growth_percentage) || 0,
                  affiliates_count: parseInt(form.affiliates_count, 10) || 0,
                  videos_count: parseInt(form.videos_count, 10) || 0,
                  why_its_a_pick: form.why_its_a_pick || null,
                  example_video_url: form.example_video_url || null,
                  min_level: form.min_level,
                  is_active: form.is_active,
                  expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
                }
                const r = editingId ? await updatePapayaPick(editingId, payload) : await addPapayaPick(payload)
                if (r.error) fb(`Error: ${r.error}`)
                else { fb(editingId ? '✓ Pick actualizado' : '✓ Pick creado'); reset() }
              })}
              className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-5 py-2 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
            >
              {isPending ? 'Guardando…' : (editingId ? 'Actualizar' : 'Crear pick')}
            </button>
            <button onClick={reset} className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-2">Cancelar</button>
          </div>
        </div>
      )}

      <Feedback msg={feedback} />

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm font-dm-sans">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['Producto', 'Niche', 'Score', 'Vendidas', 'Crecimiento', 'Afiliadas', 'Videos', 'Activo', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {picks.length === 0 && (<tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Aún no hay picks.</td></tr>)}
            {picks.map((p) => {
              const badge = pickScoreBadge(Number(p.papaya_pick_score) || 0)
              return (
                <tr key={p.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-brand-black">
                    <p>{p.product_name}</p>
                    {p.brand_name && <p className="text-xs text-gray-400">{p.brand_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.niche ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span></td>
                  <td className="px-4 py-3">{p.units_sold_this_week}</td>
                  <td className="px-4 py-3">+{Number(p.growth_percentage).toFixed(1)}%</td>
                  <td className="px-4 py-3">{p.affiliates_count}</td>
                  <td className="px-4 py-3">{p.videos_count}</td>
                  <td className="px-4 py-3">
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => { const r = await togglePapayaPick(p.id, !p.is_active); if (r.error) fb(`Error: ${r.error}`); else fb('✓ Estado actualizado') })}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                    >{p.is_active ? 'Activo' : 'Inactivo'}</button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => startEdit(p)} className="text-xs text-brand-green hover:underline mr-2">Editar</button>
                    <button
                      disabled={isPending}
                      onClick={() => { if (!confirm(`¿Eliminar "${p.product_name}"?`)) return; startTransition(async () => { const r = await deletePapayaPick(p.id); if (r.error) fb(`Error: ${r.error}`); else fb('✓ Eliminado') }) }}
                      className="text-xs text-red-400 hover:text-red-600"
                    >×</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type Tab = 'creators' | 'products' | 'campaigns' | 'applications' | 'requests' | 'initiation' | 'strategy' | 'levels' | 'rewards' | 'settings' | 'deliverables' | 'config' | 'violations' | 'announcements' | 'papaya-picks'

export default function AdminPanel({ creators, products, campaigns, applications, productRequests, initiationSelections, levels, rewards, creatorRewards, settings, deliverables, levelConfigs, violations, announcements, papayaPicks }: AdminPanelProps) {
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
    { id: 'deliverables', label: 'Entregas', count: deliverables.length },
    { id: 'levels', label: 'Niveles', count: levels.length },
    { id: 'rewards', label: 'Recompensas', count: rewards.length },
    { id: 'violations', label: 'Violations', count: violations.filter((v) => v.status === 'pending').length },
    { id: 'announcements', label: 'Announcements', count: announcements.filter((a) => a.is_active).length },
    { id: 'papaya-picks', label: '🌟 Papaya Picks', count: papayaPicks.filter((p) => p.is_active).length },
    { id: 'settings', label: 'Settings' },
    { id: 'config', label: 'Configuración' },
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
              <span className="font-dm-sans text-xs font-semibold text-white px-2.5 py-1 rounded-full" style={{ backgroundColor: '#F4A7C3' }}>🇺🇸 United States</span>
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
          {activeTab === 'creators' && <CreatorsTab creators={creators} products={products} campaigns={campaigns} />}
          {activeTab === 'products' && <ProductsTab products={products} />}
          {activeTab === 'campaigns' && <CampaignsTab campaigns={campaigns} products={products} />}
          {activeTab === 'applications' && <ApplicationsTab applications={applications} />}
          {activeTab === 'requests' && <RequestsTab productRequests={productRequests} />}
          {activeTab === 'initiation' && <InitiationTab selections={initiationSelections} />}
          {activeTab === 'strategy' && <StrategyManager creators={creators} products={products} campaigns={campaigns} />}
          {activeTab === 'levels' && <LevelsTab levels={levels} />}
          {activeTab === 'rewards' && <RewardsTab rewards={rewards} creatorRewards={creatorRewards} levels={levels} />}
          {activeTab === 'settings' && <SettingsTab settings={settings} />}
          {activeTab === 'deliverables' && <DeliverablesTab deliverables={deliverables} creators={creators} />}
          {activeTab === 'violations' && <ViolationsTab violations={violations} />}
          {activeTab === 'announcements' && <AnnouncementsTab announcements={announcements} />}
          {activeTab === 'papaya-picks' && <PapayaPicksTab picks={papayaPicks} />}
          {activeTab === 'config' && <LevelConfigTab levelConfigs={levelConfigs} />}
        </div>
      </div>
    </div>
  )
}
