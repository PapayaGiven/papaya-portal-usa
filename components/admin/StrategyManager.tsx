'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Creator, Product, Campaign } from '@/lib/types'
import { saveStrategy, getStrategyForAdmin, copyStrategyWeek, getStrategyWeekCounts, StrategyProductInput, VideoInput } from '@/app/admin/actions'

const AUTOSAVE_DEBOUNCE_MS = 3000
type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Human-friendly relative time for the "Último guardado" subtitle.
 * Kept inline (no date-fns dep) because it's the only place we need
 * it and the locale is fixed.
 */
function formatRelativeTime(ts: Date | null, now: number): string | null {
  if (!ts) return null
  const seconds = Math.max(0, Math.floor((now - ts.getTime()) / 1000))
  if (seconds < 5) return 'hace un momento'
  if (seconds < 60) return `hace ${seconds} segundos`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} minuto${minutes === 1 ? '' : 's'}`
  const hours = Math.floor(minutes / 60)
  return `hace ${hours} hora${hours === 1 ? '' : 's'}`
}

interface StrategyManagerProps {
  creators: Creator[]
  products: Product[]
  campaigns: Campaign[]
  defaultCreatorId?: string
  hideCreatorPicker?: boolean
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
    frequency_type: 'day',
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

export default function StrategyManager({ creators, products, campaigns, defaultCreatorId, hideCreatorPicker }: StrategyManagerProps) {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [creatorId, setCreatorId] = useState(defaultCreatorId ?? '')
  const [month, setMonth] = useState(defaultMonth.slice(0, 7)) // "YYYY-MM"
  const [selectedWeek, setSelectedWeek] = useState<number>(1) // week 1-4
  const [strategyProducts, setStrategyProducts] = useState<StrategyProductForm[]>([emptyProduct()])
  const [hashtagInputs, setHashtagInputs] = useState<string[]>([''])
  const [productSearches, setProductSearches] = useState<string[]>([''])
  // Parallel to strategyProducts — true = card expanded. Kept in sync
  // by every mutator (add/remove/move/load) so it doesn't drift. By
  // default only the first product is expanded; newly added products
  // open expanded so the admin can start editing immediately.
  const [expanded, setExpanded] = useState<boolean[]>([true])
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  // Target weeks for the explicit "copy week X to:" form. Mutually
  // exclusive with selectedWeek — admin can't copy a week onto itself.
  const [copyTargets, setCopyTargets] = useState<Record<number, boolean>>({})

  // ── Autosave ────────────────────────────────────────────────────────
  //
  // Strategy: debounce 3s after the last edit to strategyProducts. The
  // timer is reset on every change. Manual save + week switch cancel
  // any pending timer (week switch because the form snapshot was edited
  // against the previously-selected week and we don't want to flush it
  // onto the new week's slot).
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle')
  const [autosaveError, setAutosaveError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)
  // Marks "there's at least one user edit that hasn't reached the
  // server yet". Driven by the watch-effect below. Reset to false on
  // successful saves (manual or auto) and on loadStrategy.
  const dirtyRef = useRef(false)
  // True from `loadStrategy` start until the resulting setState lands.
  // The watch-effect uses this to skip the autosave-scheduling render
  // that's caused by the load itself (not by a user edit).
  const skipNextWatchRef = useRef(true)
  // True when the admin changed creator/month/week but hasn't yet
  // re-loaded. The current strategyProducts state is orphaned from
  // the previous selection — autosaving it would silently write the
  // wrong week's data onto the new slot. performAutoSave bails while
  // this is true; a successful loadStrategy or manual save clears it.
  const pendingSelectionLoadRef = useRef(false)
  // Skip the very first run of the selection-change effect: at mount
  // the initial creator/month/week were chosen by the parent, not by
  // a user click, so they don't represent a "needs reload" state.
  const initialMountRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  // Re-render every 15s so "hace X minutos" reflects elapsed time
  // without keeping a per-keystroke ticker running.
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  // Warn before leaving the tab when there are unsaved/saving changes.
  // We bind to beforeunload because the strategy editor lives inside
  // the admin SPA — in-app navigation away from this view unmounts the
  // component and the timer ref's cleanup discards the pending save.
  useEffect(() => {
    const hasUnsaved = dirtyRef.current || autosaveStatus === 'saving'
    if (!hasUnsaved) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      const msg = 'Tienes cambios sin guardar. ¿Salir de todas formas?'
      e.returnValue = msg
      return msg
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [autosaveStatus, strategyProducts])

  /**
   * The save closure used by both the debounce timer and the manual
   * save button. useCallback gives us a fresh closure when any of
   * (creator, month, week, products) change so the save sees the
   * latest values — no stale captures.
   */
  const performAutoSave = useCallback(async () => {
    if (!creatorId || !month) return
    // Selection changed but the user hasn't reloaded yet: the form
    // belongs to the previous selection. Bail rather than dump it
    // onto the new slot.
    if (pendingSelectionLoadRef.current) return
    if (!dirtyRef.current) return
    setAutosaveStatus('saving')
    setAutosaveError(null)
    const monthDate = `${month}-01`
    const result = await saveStrategy({
      creator_id: creatorId,
      month: monthDate,
      week: selectedWeek,
      products: strategyProducts,
    })
    if (!isMountedRef.current) return
    if (result.error) {
      setAutosaveStatus('error')
      setAutosaveError(result.error)
      return
    }
    dirtyRef.current = false
    setLastSavedAt(new Date())
    setAutosaveStatus('saved')
  }, [creatorId, month, selectedWeek, strategyProducts])

  // Mirror the latest performAutoSave into a ref so the watch-effect
  // below can call the freshest version without listing it as a
  // dependency. Avoids unnecessary effect re-runs when only creator/
  // month/week change (no real form edit) which would otherwise mark
  // the form dirty and schedule a save against the new selection.
  const performAutoSaveRef = useRef(performAutoSave)
  useEffect(() => {
    performAutoSaveRef.current = performAutoSave
  })

  // Watch the form snapshot. Any real edit marks dirty + (re)schedules
  // the debounced autosave. The first render after a load is a
  // "synthetic" change (setStrategyProducts inside loadStrategy) so
  // we gate it behind skipNextWatchRef.
  useEffect(() => {
    if (skipNextWatchRef.current) {
      skipNextWatchRef.current = false
      return
    }
    dirtyRef.current = true
    setAutosaveStatus((prev) => (prev === 'saving' ? prev : 'idle'))
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      performAutoSaveRef.current()
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [strategyProducts])

  // Selection changed (creator/month/week). The form is now orphaned
  // from the new selection — kill any pending autosave and flag that
  // the next save needs to be preceded by an explicit Cargar (or
  // manual Save, which is explicit user intent).
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false
      return
    }
    pendingSelectionLoadRef.current = true
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    setAutosaveStatus('idle')
  }, [creatorId, month, selectedWeek])

  function setProductSearch(index: number, value: string) {
    setProductSearches((prev) => prev.map((v, i) => i === index ? value : v))
  }

  function fb(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 5000)
  }

  function loadStrategy() {
    if (!creatorId || !month) return
    setLoading(true)
    // Whatever's about to land on strategyProducts is "what the DB
    // has" — not a user edit. Tell the watch-effect to skip the next
    // run so we don't autosave it back. Also discard any pending
    // autosave timer + dirty mark from the previous week.
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    dirtyRef.current = false
    skipNextWatchRef.current = true
    pendingSelectionLoadRef.current = false
    setAutosaveStatus('idle')
    setAutosaveError(null)
    const monthDate = `${month}-01`
    startTransition(async () => {
      const result = await getStrategyForAdmin(creatorId, monthDate, selectedWeek)
      setLoading(false)
      if (result.error) { fb(`Error: ${result.error}`); return }
      if (!result.data) {
        setStrategyProducts([emptyProduct()])
        setHashtagInputs([''])
        setProductSearches([''])
        setExpanded([true])
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
          frequency_type: ((p.frequency_type as string) === 'week' ? 'week' : 'day') as 'day' | 'week',
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
      // First card expanded by default so the admin sees something
      // when the strategy lands, the rest collapsed for density.
      setExpanded(finalProducts.map((_, i) => i === 0))
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
    // New cards start expanded — the admin just added it because
    // they want to fill it in.
    setExpanded((prev) => [...prev, true])
  }

  function removeProduct(index: number) {
    setStrategyProducts((prev) => prev.filter((_, i) => i !== index))
    setHashtagInputs((prev) => prev.filter((_, i) => i !== index))
    setProductSearches((prev) => prev.filter((_, i) => i !== index))
    setExpanded((prev) => prev.filter((_, i) => i !== index))
  }

  /**
   * Swap a product with its neighbour above/below. We mutate all four
   * parallel arrays in lockstep so positions stay aligned, then the
   * autosave watch-effect picks up the strategyProducts change and
   * schedules a save that persists the new order_index values.
   */
  function moveProduct(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= strategyProducts.length) return
    function swap<T>(arr: T[]): T[] {
      const next = arr.slice()
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    }
    setStrategyProducts((prev) => swap(prev))
    setHashtagInputs((prev) => swap(prev))
    setProductSearches((prev) => swap(prev))
    setExpanded((prev) => swap(prev))
  }

  function toggleExpand(index: number) {
    setExpanded((prev) => prev.map((v, i) => (i === index ? !v : v)))
  }

  const allExpanded = expanded.length > 0 && expanded.every(Boolean)
  const allCollapsed = expanded.every((v) => !v)
  function setAllExpanded(open: boolean) {
    setExpanded((prev) => prev.map(() => open))
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

  /**
   * Copies the current week's strategy products to the explicitly checked
   * target weeks. Same replace-vs-merge prompt as before, but only for
   * the subset the admin actually picked.
   */
  function handleCopySelected() {
    if (!creatorId || !month) { fb('Error: Carga primero una estrategia.'); return }
    const monthDate = `${month}-01`
    const targets = [1, 2, 3, 4].filter((w) => w !== selectedWeek && copyTargets[w])
    if (targets.length === 0) { fb('Elige al menos una semana destino.'); return }

    const ok = confirm(
      `¿Copiar la estrategia de Semana ${selectedWeek} a Semana ${targets.join(', ')}?`,
    )
    if (!ok) return

    startTransition(async () => {
      const { counts, error } = await getStrategyWeekCounts(creatorId, monthDate)
      if (error) { fb(`Error: ${error}`); return }
      const occupied = targets.filter((w) => (counts?.[w] ?? 0) > 0)

      let mode: 'replace' | 'merge' = 'replace'
      if (occupied.length > 0) {
        const message = `Las semanas ${occupied.join(', ')} ya tienen productos. ¿Reemplazar (OK) o agregar (Cancelar)?`
        mode = confirm(message) ? 'replace' : 'merge'
      }

      const result = await copyStrategyWeek({
        creator_id: creatorId,
        month: monthDate,
        source_week: selectedWeek,
        target_weeks: targets,
        mode,
      })
      if (result.error) fb(`Error: ${result.error}`)
      else {
        fb(`Estrategia copiada a Semana ${targets.join(', ')} ✓`)
        setCopyTargets({})
      }
    })
  }

  function handleSave() {
    if (!creatorId) { fb('Error: Selecciona una creadora.'); return }
    if (!month) { fb('Error: Selecciona un mes.'); return }
    // Manual save overrides the pending autosave — kill the timer so
    // we don't double-save 3s after this click.
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    setAutosaveStatus('saving')
    setAutosaveError(null)
    startTransition(async () => {
      const monthDate = `${month}-01`
      const result = await saveStrategy({
        creator_id: creatorId,
        month: monthDate,
        week: selectedWeek,
        products: strategyProducts,
      })
      if (!isMountedRef.current) return
      if (result.error) {
        setAutosaveStatus('error')
        setAutosaveError(result.error)
        fb(`Error: ${result.error}`)
        return
      }
      dirtyRef.current = false
      // Manual save is also an explicit "I want THIS form against THIS
      // selection committed" — clear the orphan guard.
      pendingSelectionLoadRef.current = false
      setLastSavedAt(new Date())
      setAutosaveStatus('saved')
      fb('¡Estrategia guardada!')
    })
  }

  const relativeSaved = formatRelativeTime(lastSavedAt, nowTick)

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="font-dm-sans font-bold text-lg text-brand-black">Gestor de estrategias</h2>
          {relativeSaved && (
            <p className="font-dm-sans text-xs text-gray-400 mt-0.5">
              Último guardado: {relativeSaved}
            </p>
          )}
        </div>
        <AutosaveStatusPill
          status={autosaveStatus}
          error={autosaveError}
        />
      </div>

      {/* Creator + Month selector */}
      <div className="bg-brand-light-pink border border-brand-pink/20 rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          {!hideCreatorPicker && (
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
          )}
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

        {/* Pick which weeks to copy the current week into. The selected
            source week is unselectable on purpose. */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <span className="font-dm-sans text-sm font-semibold text-brand-black">
            Copiar Semana {selectedWeek} a:
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            {[1, 2, 3, 4].map((w) => {
              const isSource = w === selectedWeek
              const checked = !!copyTargets[w] && !isSource
              return (
                <label
                  key={w}
                  className={`inline-flex items-center gap-1.5 font-dm-sans text-sm ${
                    isSource ? 'text-gray-300 cursor-not-allowed' : 'text-brand-black cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isSource}
                    onChange={(e) => setCopyTargets((prev) => ({ ...prev, [w]: e.target.checked }))}
                    className="w-4 h-4 accent-brand-pink"
                  />
                  Semana {w}
                </label>
              )
            })}
          </div>
          <button
            type="button"
            disabled={!creatorId || !month || isPending || Object.values(copyTargets).every((v) => !v)}
            onClick={handleCopySelected}
            className="font-dm-sans text-sm font-semibold bg-brand-pink text-white px-4 py-2 rounded-xl hover:bg-brand-pink/90 transition disabled:opacity-40"
          >
            📋 Copiar seleccionadas
          </button>
        </div>
      </div>

      {feedback && (
        <p className={`text-sm font-dm-sans mb-4 px-3 py-2 rounded-lg ${feedback.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
          {feedback}
        </p>
      )}

      {/* Products list controls */}
      {strategyProducts.length > 1 && (
        <div className="flex items-center justify-between mb-3">
          <p className="font-dm-sans text-xs text-gray-400">
            {strategyProducts.length} productos
          </p>
          <button
            type="button"
            onClick={() => setAllExpanded(!allExpanded)}
            className="font-dm-sans text-xs font-semibold text-gray-500 hover:text-brand-black transition"
          >
            {allExpanded ? 'Colapsar todos' : allCollapsed ? 'Expandir todos' : 'Expandir todos'}
          </button>
        </div>
      )}

      {/* Products */}
      <div className="space-y-3">
        {strategyProducts.map((sp, pi) => {
          const isOpen = expanded[pi] ?? false
          const productName = sp.is_external
            ? (sp.external_product_name?.trim() || '(producto externo sin nombre)')
            : (products.find((p) => p.id === sp.product_id)?.name || '(producto sin seleccionar)')
          const isFirst = pi === 0
          const isLast = pi === strategyProducts.length - 1
          return (
          <div key={pi} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            {/* Product header — click anywhere on it (outside the
                inner buttons) toggles collapse */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleExpand(pi)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(pi) }
              }}
              className="flex items-center justify-between gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100/60 transition"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span aria-hidden className="font-dm-sans text-xs text-gray-400 w-3 shrink-0">
                  {isOpen ? '▼' : '▶'}
                </span>
                <span className="font-dm-sans font-semibold text-sm text-brand-black shrink-0">
                  Producto {pi + 1}
                </span>
                <span className="font-dm-sans text-sm text-gray-500 truncate">
                  · {productName}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${PRIORITY_COLORS[sp.priority as keyof typeof PRIORITY_COLORS] ?? PRIORITY_COLORS.Secondary}`}>
                  {sp.priority}
                </span>
                {!isOpen && sp.videos_per_day != null && (
                  <span className="font-dm-sans text-[11px] text-gray-500 shrink-0">
                    {sp.videos_per_day} videos / {(sp.frequency_type ?? 'day') === 'week' ? 'sem' : 'día'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  disabled={isFirst}
                  onClick={() => moveProduct(pi, -1)}
                  title="Subir"
                  aria-label="Subir producto"
                  className="text-gray-400 hover:text-brand-black disabled:opacity-30 disabled:hover:text-gray-400 px-1.5 py-1 rounded transition"
                >↑</button>
                <button
                  type="button"
                  disabled={isLast}
                  onClick={() => moveProduct(pi, 1)}
                  title="Bajar"
                  aria-label="Bajar producto"
                  className="text-gray-400 hover:text-brand-black disabled:opacity-30 disabled:hover:text-gray-400 px-1.5 py-1 rounded transition"
                >↓</button>
                {strategyProducts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProduct(pi)}
                    title="Eliminar producto"
                    className="text-xs text-red-400 hover:text-red-600 ml-1 px-1.5 py-1"
                  >
                    × Eliminar
                  </button>
                )}
              </div>
            </div>

            {isOpen && (
            <div className="p-5 space-y-4">
              {/* Priority — moved out of the header so the collapsed
                  state can keep the header compact. Buttons act as a
                  segmented control. */}
              <div className="flex items-center gap-2">
                <span className="font-dm-sans text-xs text-gray-500 mr-1">Prioridad:</span>
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
              </div>
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
                    ) : (() => {
                      const query = (productSearches[pi] ?? '').trim().toLowerCase()
                      const filtered = query
                        ? products.filter((p) => p.name.toLowerCase().includes(query))
                        : products
                      return (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={productSearches[pi] ?? ''}
                            onChange={(e) => setProductSearch(pi, e.target.value)}
                            placeholder="Buscar producto..."
                            className="input-field w-full"
                          />
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                updateProduct(pi, { product_id: e.target.value })
                                setProductSearch(pi, '')
                              }
                            }}
                            className="input-field w-full"
                          >
                            <option value="">Seleccionar producto...</option>
                            {filtered.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.commission_rate}%)
                              </option>
                            ))}
                          </select>
                          <p className="font-dm-sans text-xs text-gray-400">
                            Mostrando {filtered.length} de {products.length} productos
                          </p>
                        </div>
                      )
                    })()}
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
                  <label className="block font-dm-sans text-xs font-medium text-gray-500 mb-1">
                    Videos {(sp.frequency_type ?? 'day') === 'week' ? '/ Semana' : '/ Día'}
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={sp.videos_per_day ?? ''}
                      onChange={(e) => updateProduct(pi, { videos_per_day: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder={(sp.frequency_type ?? 'day') === 'week' ? 'ej. 5' : 'ej. 2'}
                      className="input-field flex-1"
                    />
                    <div className="flex gap-0.5 bg-gray-50 border border-gray-200 rounded-xl p-0.5">
                      {(['day', 'week'] as const).map((ft) => {
                        const active = (sp.frequency_type ?? 'day') === ft
                        return (
                          <button
                            key={ft}
                            type="button"
                            onClick={() => updateProduct(pi, { frequency_type: ft })}
                            className={`font-dm-sans text-[11px] font-semibold px-2 rounded-lg transition ${
                              active ? 'bg-brand-green text-white' : 'text-gray-500 hover:text-brand-black'
                            }`}
                          >
                            {ft === 'day' ? 'por día' : 'por semana'}
                          </button>
                        )
                      })}
                    </div>
                  </div>
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
            )}
          </div>
          )
        })}
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

/**
 * Small visual indicator in the top right of the strategy editor. The
 * four states map to: idle (no recent activity), saving (in flight),
 * saved (last action succeeded), error (last action failed — error
 * message shown via title attribute so it stays out of the layout).
 */
function AutosaveStatusPill({
  status,
  error,
}: {
  status: AutosaveStatus
  error: string | null
}) {
  if (status === 'saving') {
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 text-xs font-dm-sans font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full"
      >
        <span
          aria-hidden
          className="inline-block w-3 h-3 rounded-full border-2 border-gray-400 border-t-transparent animate-spin"
        />
        Guardando…
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 text-xs font-dm-sans font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full"
      >
        ✓ Guardado
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span
        role="alert"
        title={error ?? undefined}
        className="inline-flex items-center gap-1.5 text-xs font-dm-sans font-medium bg-red-50 text-red-600 px-2.5 py-1 rounded-full max-w-[260px]"
      >
        ⚠ <span className="truncate">Error al guardar</span>
      </span>
    )
  }
  // idle — render an empty placeholder so the header layout doesn't
  // jump when the pill appears/disappears.
  return <span aria-hidden className="inline-block h-6" />
}
