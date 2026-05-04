'use client'

import { useState, useTransition, useEffect } from 'react'
import { Creator, Product, Campaign } from '@/lib/types'
import { saveStrategy, getStrategyForAdmin, StrategyProductInput, VideoInput } from '@/app/admin/actions'

interface StrategyManagerProps {
  creators: Creator[]
  products: Product[]
  campaigns: Campaign[]
}

const PRIORITIES = ['Hero', 'Secondary', 'Supporting'] as const

const PRIORITY_COLORS = {
  Hero: 'bg-amber-100 text-amber-700 border-amber-300',
  Secondary: 'bg-brand-pink/20 text-brand-black border-brand-pink/40',
  Supporting: 'bg-gray-100 text-gray-600 border-gray-200',
}

type StrategyProductForm = StrategyProductInput & {
  is_external: boolean
  external_product_name: string
  external_brand: string
  external_commission: string
  external_link: string
}

function emptyProduct(): StrategyProductForm {
  return {
    product_id: '',
    priority: 'Secondary',
    videos_per_day: null,
    live_hours_per_week: null,
    gmv_target: null,
    strategy_note: '',
    hashtags: [],
    is_retainer: false,
    campaign_id: null,
    brief_url: null,
    video_focus: '',
    quick_checklist: [],
    videos: [],
    is_external: false,
    external_product_name: '',
    external_brand: '',
    external_commission: '',
    external_link: '',
  }
}

export default function StrategyManager({ creators, products, campaigns }: StrategyManagerProps) {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [creatorId, setCreatorId] = useState('')
  const [month, setMonth] = useState(defaultMonth.slice(0, 7)) // "YYYY-MM"
  const [selectedWeek, setSelectedWeek] = useState<number>(1) // week 1-4
  const [strategyProducts, setStrategyProducts] = useState<StrategyProductForm[]>([emptyProduct()])
  const [hashtagInputs, setHashtagInputs] = useState<string[]>([''])
  const [productSearches, setProductSearches] = useState<string[]>([''])
  const [productSearchDebounced, setProductSearchDebounced] = useState<string[]>([''])
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  function setProductSearch(index: number, value: string) {
    setProductSearches((prev) => prev.map((v, i) => i === index ? value : v))
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setProductSearchDebounced(productSearches)
    }, 200)
    return () => clearTimeout(timer)
  }, [productSearches])

  function fb(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 5000)
  }

  function loadStrategy() {
    if (!creatorId || !month) return
    setLoading(true)
    const monthDate = `${month}-01`
    startTransition(async () => {
      const result = await getStrategyForAdmin(creatorId, monthDate)
      setLoading(false)
      if (result.error) { fb(`Error: ${result.error}`); return }
      if (!result.data) {
        setStrategyProducts([emptyProduct()])
        setHashtagInputs([''])
        fb('No hay estrategia para este mes — Se creará una nueva.')
        return
      }
      type RawProduct = Record<string, unknown> & { videos?: Record<string, unknown>[] }
      const loaded: StrategyProductForm[] = result.data.products.map((p: RawProduct) => {
        const externalCommission = p.external_commission
        return {
          product_id: (p.product_id as string) ?? '',
          priority: (p.priority as string) ?? 'Secondary',
          videos_per_day: p.videos_per_day as number | null,
          live_hours_per_week: p.live_hours_per_week as number | null,
          gmv_target: p.gmv_target as number | null,
          strategy_note: (p.strategy_note as string) ?? '',
          hashtags: (p.hashtags as string[]) ?? [],
          is_retainer: (p.is_retainer as boolean) ?? false,
          campaign_id: (p.campaign_id as string | null) ?? null,
          brief_url: (p.brief_url as string | null) ?? null,
          video_focus: (p.video_focus as string) ?? '',
          quick_checklist: (p.quick_checklist as string[]) ?? [],
          videos: ((p.videos ?? []) as Record<string, unknown>[]).map((v) => ({
            video_url: (v.video_url as string) ?? '',
            thumbnail_url: (v.thumbnail_url as string) ?? '',
          })),
          is_external: (p.is_external as boolean) ?? false,
          external_product_name: (p.external_product_name as string) ?? '',
          external_brand: (p.external_brand as string) ?? '',
          external_commission: externalCommission == null ? '' : String(externalCommission),
          external_link: (p.external_link as string) ?? '',
        }
      })
      const finalProducts = loaded.length > 0 ? loaded : [emptyProduct()]
      setStrategyProducts(finalProducts)
      setHashtagInputs(finalProducts.map((p) => p.hashtags.join(', ')))
      setProductSearches(finalProducts.map(() => ''))
      fb(`✓ Estrategia cargada (${loaded.length} productos)`)
    })
  }

  function updateProduct(index: number, updates: Partial<StrategyProductForm>) {
    setStrategyProducts((prev) => prev.map((p, i) => i === index ? { ...p, ...updates } : p))
  }

  function updateHashtagInput(index: number, value: string) {
    setHashtagInputs((prev) => prev.map((h, i) => i === index ? value : h))
    const tags = value.split(',').map((t) => t.trim()).filter(Boolean)
    updateProduct(index, { hashtags: tags })
  }

  function addProduct() {
    setStrategyProducts((prev) => [...prev, emptyProduct()])
    setHashtagInputs((prev) => [...prev, ''])
    setProductSearches((prev) => [...prev, ''])
  }

  function removeProduct(index: number) {
    setStrategyProducts((prev) => prev.filter((_, i) => i !== index))
    setHashtagInputs((prev) => prev.filter((_, i) => i !== index))
    setProductSearches((prev) => prev.filter((_, i) => i !== index))
  }

  function addVideo(productIndex: number) {
    updateProduct(productIndex, {
      videos: [...strategyProducts[productIndex].videos, { video_url: '', thumbnail_url: '' }],
    })
  }

  function updateVideo(productIndex: number, videoIndex: number, field: keyof VideoInput, value: string) {
    const updated = strategyProducts[productIndex].videos.map((v, i) =>
      i === videoIndex ? { ...v, [field]: value } : v
    )
    updateProduct(productIndex, { videos: updated })
  }

  function removeVideo(productIndex: number, videoIndex: number) {
    updateProduct(productIndex, {
      videos: strategyProducts[productIndex].videos.filter((_, i) => i !== videoIndex),
    })
  }

  function handleSave() {
    if (!creatorId) { fb('Error: Selecciona una creadora.'); return }
    if (!month) { fb('Error: Selecciona un mes.'); return }
    startTransition(async () => {
      const monthDate = `${month}-01`
      const result = await saveStrategy({
        creator_id: creatorId,
        month: monthDate,
        products: strategyProducts,
      })
      if (result.error) fb(`Error: ${result.error}`)
      else fb('¡Estrategia guardada!')
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dm-sans font-bold text-lg text-brand-black">Gestor de estrategias</h2>
      </div>

      {/* Creator + Month selector */}
      <div className="bg-brand-light-pink border border-brand-pink/20 rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Creator</label>
            <select
              value={creatorId}
              onChange={(e) => setCreatorId(e.target.value)}
              className="input-field w-full"
            >
              <option value="">Seleccionar creadora…</option>
              {creators.filter((c) => c.is_active).map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mes</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Semana</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedWeek(w)}
                  className={`font-dm-sans text-sm font-semibold px-3.5 py-2 rounded-xl border transition ${
                    selectedWeek === w
                      ? 'bg-brand-black text-white border-brand-black'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  S{w}
                </button>
              ))}
            </div>
          </div>
          <button
            disabled={!creatorId || !month || loading || isPending}
            onClick={loadStrategy}
            className="font-dm-sans text-sm font-semibold bg-brand-black text-white px-4 py-2.5 rounded-xl hover:bg-brand-black/80 transition disabled:opacity-40"
          >
            {loading ? 'Cargando...' : 'Cargar / crear estrategia'}
          </button>
        </div>
      </div>

      {feedback && (
        <p className={`text-sm font-dm-sans mb-4 px-3 py-2 rounded-lg ${feedback.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
          {feedback}
        </p>
      )}

      {/* Products */}
      <div className="space-y-6">
        {strategyProducts.map((sp, pi) => (
          <div key={pi} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            {/* Product header */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
              <span className="font-dm-sans font-semibold text-sm text-brand-black">Producto {pi + 1}</span>
              <div className="flex items-center gap-2">
                {PRIORITIES.map((prio) => (
                  <button
                    key={prio}
                    type="button"
                    onClick={() => updateProduct(pi, { priority: prio })}
                    className={`text-xs font-semibold px-3 py-1 rounded-full border transition ${sp.priority === prio ? PRIORITY_COLORS[prio] : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                  >
                    {prio}
                  </button>
                ))}
                {strategyProducts.length > 1 && (
                  <button onClick={() => removeProduct(pi)} className="text-xs text-red-400 hover:text-red-600 ml-2">
                    × Eliminar
                  </button>
                )}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* External product toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => updateProduct(pi, sp.is_external
                    ? { is_external: false, external_product_name: '', external_brand: '', external_commission: '', external_link: '' }
                    : { is_external: true, product_id: '', campaign_id: null }
                  )}
                  className={`relative w-10 h-6 rounded-full transition-colors ${sp.is_external ? 'bg-brand-pink' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${sp.is_external ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="font-dm-sans text-sm text-gray-700">Producto externo (no está en el catálogo)</span>
              </label>

              {/* Product selection */}
              {sp.is_external ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-dm-sans text-xs font-medium text-gray-500 mb-1">Nombre del producto</label>
                    <input
                      type="text"
                      value={sp.external_product_name ?? ''}
                      onChange={(e) => updateProduct(pi, { external_product_name: e.target.value })}
                      placeholder="ej. Serum Vitamina C"
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-dm-sans text-xs font-medium text-gray-500 mb-1">Marca</label>
                    <input
                      type="text"
                      value={sp.external_brand ?? ''}
                      onChange={(e) => updateProduct(pi, { external_brand: e.target.value })}
                      placeholder="ej. Glow Labs"
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-dm-sans text-xs font-medium text-gray-500 mb-1">Comisión (%)</label>
                    <input
                      type="text"
                      value={sp.external_commission ?? ''}
                      onChange={(e) => updateProduct(pi, { external_commission: e.target.value })}
                      placeholder="ej. 15"
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-dm-sans text-xs font-medium text-gray-500 mb-1">Link del producto</label>
                    <input
                      type="url"
                      value={sp.external_link ?? ''}
                      onChange={(e) => updateProduct(pi, { external_link: e.target.value })}
                      placeholder="https://…"
                      className="input-field w-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-dm-sans text-xs font-medium text-gray-500 mb-1">Producto</label>
                    {sp.product_id ? (
                      <div className="flex items-center gap-2 input-field bg-brand-light-pink/40">
                        <span className="font-dm-sans text-sm text-brand-black flex-1 truncate">
                          {products.find((p) => p.id === sp.product_id)?.name ?? sp.product_id}
                        </span>
                        <button
                          type="button"
                          onClick={() => { updateProduct(pi, { product_id: '' }); setProductSearch(pi, '') }}
                          className="text-xs text-red-400 hover:text-red-600 shrink-0"
                        >× Cambiar</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={productSearches[pi] ?? ''}
                          onChange={(e) => setProductSearch(pi, e.target.value)}
                          placeholder="Escribe para buscar productos..."
                          className="input-field w-full"
                        />
                        {(productSearchDebounced[pi] ?? '').trim() && (
                          <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-50">
                            {products
                              .filter((p) => p.name.toLowerCase().includes((productSearchDebounced[pi] ?? '').toLowerCase()))
                              .slice(0, 12)
                              .map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => { updateProduct(pi, { product_id: p.id }); setProductSearch(pi, '') }}
                                  className="w-full text-left px-3 py-2 text-sm font-dm-sans hover:bg-brand-light-pink transition"
                                >
                                  {p.name} <span className="text-xs text-gray-400">({p.commission_rate}%)</span>
                                </button>
                              ))}
                            {products.filter((p) => p.name.toLowerCase().includes((productSearchDebounced[pi] ?? '').toLowerCase())).length === 0 && (
                              <p className="px-3 py-2 text-xs text-gray-400">Sin resultados.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block font-dm-sans text-xs font-medium text-gray-500 mb-1">Campaña vinculada (opcional)</label>
                    <select
                      value={sp.campaign_id ?? ''}
                      onChange={(e) => updateProduct(pi, { campaign_id: e.target.value || null })}
                      className="input-field w-full"
                    >
                      <option value="">Sin campaña</option>
                      {campaigns.filter((c) => c.status === 'active').map((c) => (
                        <option key={c.id} value={c.id}>{c.brand_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-dm-sans text-xs font-medium text-gray-500 mb-1">Videos / Día</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={sp.videos_per_day ?? ''}
                    onChange={(e) => updateProduct(pi, { videos_per_day: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="ej. 2"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block font-dm-sans text-xs font-medium text-gray-500 mb-1">Horas live / Semana</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={sp.live_hours_per_week ?? ''}
                    onChange={(e) => updateProduct(pi, { live_hours_per_week: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="ej. 3"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block font-dm-sans text-xs font-medium text-gray-500 mb-1">Meta GMV ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={sp.gmv_target ?? ''}
                    onChange={(e) => updateProduct(pi, { gmv_target: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="ej. 1500"
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* Strategy note */}
              <div>
                <label className="block font-dm-sans text-xs font-medium text-gray-500 mb-1">Nota de estrategia</label>
                <textarea
                  rows={3}
                  value={sp.strategy_note}
                  onChange={(e) => updateProduct(pi, { strategy_note: e.target.value })}
                  placeholder="Tips, temas de enfoque, Dos & Don'ts para este producto…"
                  className="input-field w-full resize-none"
                />
              </div>

              {/* Video Focus */}
              <div>
                <label className="block font-dm-sans text-xs font-medium text-gray-500 mb-1">Enfoque del video</label>
                <input
                  type="text"
                  value={sp.video_focus}
                  onChange={(e) => updateProduct(pi, { video_focus: e.target.value })}
                  placeholder="ej. Antes/después + estatura"
                  className="input-field w-full"
                />
              </div>

              {/* Quick Checklist */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-dm-sans text-xs font-medium text-gray-500">Checklist rápido (máx. 5)</label>
                  {sp.quick_checklist.length < 5 && (
                    <button
                      type="button"
                      onClick={() => updateProduct(pi, { quick_checklist: [...sp.quick_checklist, ''] })}
                      className="font-dm-sans text-xs font-semibold text-brand-green hover:underline"
                    >
                      + Agregar item
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {sp.quick_checklist.map((item, ci) => (
                    <div key={ci} className="flex gap-2 items-center">
                      <span className="text-green-500 text-sm shrink-0">✓</span>
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const updated = [...sp.quick_checklist]
                          updated[ci] = e.target.value
                          updateProduct(pi, { quick_checklist: updated })
                        }}
                        placeholder="ej. Talla, Ajuste, Outfits..."
                        className="input-field flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => updateProduct(pi, { quick_checklist: sp.quick_checklist.filter((_, i) => i !== ci) })}
                        className="text-red-400 hover:text-red-600 px-2 shrink-0"
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brief URL */}
              <div>
                <label className="block font-dm-sans text-xs font-medium text-gray-500 mb-1">Brief URL</label>
                <input
                  type="url"
                  value={sp.brief_url ?? ''}
                  onChange={(e) => updateProduct(pi, { brief_url: e.target.value || null })}
                  placeholder="https://…"
                  className="input-field w-full"
                />
              </div>

              {/* Hashtags */}
              <div>
                <label className="block font-dm-sans text-xs font-medium text-gray-500 mb-1">Hashtags (separados por coma)</label>
                <input
                  type="text"
                  value={hashtagInputs[pi] ?? ''}
                  onChange={(e) => updateHashtagInput(pi, e.target.value)}
                  placeholder="#skincare, #tiktokshop, #beauty"
                  className="input-field w-full"
                />
                {sp.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {sp.hashtags.map((tag) => (
                      <span key={tag} className="text-xs bg-brand-light-pink text-brand-green px-2 py-0.5 rounded-full font-medium">#{tag.replace('#', '')}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Retainer toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => updateProduct(pi, { is_retainer: !sp.is_retainer })}
                  className={`relative w-10 h-6 rounded-full transition-colors ${sp.is_retainer ? 'bg-brand-green' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${sp.is_retainer ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="font-dm-sans text-sm text-gray-700">Parte de una campaña Retainer</span>
              </label>

              {/* Example videos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-dm-sans text-xs font-medium text-gray-500">Videos de ejemplo (máx. 6)</label>
                  {sp.videos.length < 6 && (
                    <button
                      type="button"
                      onClick={() => addVideo(pi)}
                      className="font-dm-sans text-xs font-semibold text-brand-green hover:underline"
                    >
                      + Agregar video
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {sp.videos.map((v, vi) => (
                    <div key={vi} className="flex gap-2 items-start">
                      <input
                        type="url"
                        value={v.video_url}
                        onChange={(e) => updateVideo(pi, vi, 'video_url', e.target.value)}
                        placeholder="URL de video TikTok"
                        className="input-field flex-1"
                      />
                      <input
                        type="url"
                        value={v.thumbnail_url}
                        onChange={(e) => updateVideo(pi, vi, 'thumbnail_url', e.target.value)}
                        placeholder="URL de thumbnail (opcional)"
                        className="input-field flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeVideo(pi, vi)}
                        className="text-red-400 hover:text-red-600 px-2 py-2 shrink-0"
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          type="button"
          onClick={addProduct}
          className="font-dm-sans text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-brand-green hover:text-brand-green px-5 py-2.5 rounded-xl transition"
        >
          + Agregar producto
        </button>
        <button
          disabled={isPending || !creatorId}
          onClick={handleSave}
          className="font-dm-sans text-sm font-semibold bg-brand-green text-white px-6 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : '✓ Guardar estrategia'}
        </button>
      </div>
    </div>
  )
}
