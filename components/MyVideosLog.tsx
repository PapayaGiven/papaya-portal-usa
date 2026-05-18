'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, Check, ExternalLink } from 'lucide-react'
import { getVideoLogsForRange, logVideoPostedToday, type VideoLogRow } from '@/app/strategy/actions'

export interface StrategyProductForLog {
  id: string
  product?: { id: string; name: string } | null
  external_product_name?: string | null
  videos_per_day: number | null
  frequency_type?: 'day' | 'week' | null
  priority: 'Hero' | 'Secondary' | 'Supporting'
}

interface MyVideosLogProps {
  strategyProducts: StrategyProductForLog[]
  initialWeekStart: string // YYYY-MM-DD of Monday
  initialVideos: VideoLogRow[]
}

function dailyTarget(sp: StrategyProductForLog): number {
  const raw = sp.videos_per_day ?? 0
  if (raw <= 0) return 0
  return sp.frequency_type === 'week' ? Math.max(1, Math.ceil(raw / 7)) : raw
}

function fmtIso(d: Date): string {
  return d.toISOString().split('T')[0]
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d)
  c.setUTCDate(c.getUTCDate() + n)
  return c
}

function parseDay(iso: string): Date {
  // Parse as UTC midnight so day-of-week math is stable across TZs.
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('es-US', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
}

const PRIORITY_BADGE: Record<StrategyProductForLog['priority'], string> = {
  Hero: 'bg-amber-100 text-amber-700',
  Secondary: 'bg-brand-pink/15 text-brand-pink',
  Supporting: 'bg-gray-100 text-gray-600',
}

const PRIORITY_LABEL: Record<StrategyProductForLog['priority'], string> = {
  Hero: 'Hero',
  Secondary: 'Sub-hero',
  Supporting: 'Apoyo',
}

interface PendingSlot {
  sp: StrategyProductForLog
  dateIso: string
}

export default function MyVideosLog({ strategyProducts, initialWeekStart, initialVideos }: MyVideosLogProps) {
  const [weekStart, setWeekStart] = useState<string>(initialWeekStart)
  const [videos, setVideos] = useState<VideoLogRow[]>(initialVideos)
  const [pending, setPending] = useState<PendingSlot | null>(null)
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()

  const todayIso = useMemo(() => fmtIso(new Date()), [])
  const start = useMemo(() => parseDay(weekStart), [weekStart])
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start])
  const endExclusive = addDays(start, 7)

  const liveProducts = useMemo(
    () => strategyProducts.filter((sp) => dailyTarget(sp) > 0),
    [strategyProducts],
  )

  // Refetch when the week changes. initialVideos covers the initial
  // weekStart; subsequent week swaps hit the server.
  useEffect(() => {
    if (weekStart === initialWeekStart) return
    let cancelled = false
    setLoading(true)
    getVideoLogsForRange({
      start: `${weekStart}T00:00:00Z`,
      endExclusive: `${fmtIso(endExclusive)}T00:00:00Z`,
    })
      .then((r) => {
        if (cancelled) return
        if (r.rows) setVideos(r.rows)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  // Bucket videos by `${productId}_${dateIso}` for fast lookup.
  const completedByKey = useMemo(() => {
    const map = new Map<string, VideoLogRow[]>()
    for (const v of videos) {
      const day = fmtIso(new Date(v.created_at))
      const key = `${v.product_id ?? 'none'}_${day}`
      const arr = map.get(key) ?? []
      arr.push(v)
      map.set(key, arr)
    }
    return map
  }, [videos])

  function shiftWeek(deltaWeeks: number) {
    const ns = addDays(start, deltaWeeks * 7)
    setWeekStart(fmtIso(ns))
  }

  function rangeLabel() {
    const last = addDays(start, 6)
    const sameMonth = start.getUTCMonth() === last.getUTCMonth()
    const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('es-US', { ...opts, timeZone: 'UTC' })
    if (sameMonth) {
      return `${fmt(start, { day: 'numeric' })} – ${fmt(last, { day: 'numeric', month: 'long', year: 'numeric' })}`
    }
    return `${fmt(start, { day: 'numeric', month: 'short' })} – ${fmt(last, { day: 'numeric', month: 'short', year: 'numeric' })}`
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
      {/* Week navigator */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h3 className="font-playfair text-2xl text-brand-black">Mis videos</h3>
          <p className="font-dm-sans text-xs text-gray-500 capitalize">{rangeLabel()}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(initialWeekStart)}
            className="px-3 h-9 rounded-xl border border-gray-200 text-xs font-dm-sans font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Esta semana
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition"
            aria-label="Semana siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {liveProducts.length === 0 ? (
        <p className="font-dm-sans text-sm text-gray-500 py-6 text-center">
          Aún no tienes productos con video diario en tu estrategia.
        </p>
      ) : (
        <div className="space-y-4">
          {days.map((day) => {
            const dayIso = fmtIso(day)
            const isFuture = dayIso > todayIso
            const isToday = dayIso === todayIso

            // Total slots for the day across all products.
            const slots: { sp: StrategyProductForLog; index: number }[] = []
            for (const sp of liveProducts) {
              const target = dailyTarget(sp)
              for (let i = 0; i < target; i++) slots.push({ sp, index: i })
            }

            return (
              <section key={dayIso} className={`rounded-xl border ${isToday ? 'border-brand-green/40 bg-brand-green/5' : 'border-gray-100 bg-gray-50/40'} p-4`}>
                <header className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h4 className={`font-dm-sans text-sm font-bold capitalize ${isToday ? 'text-brand-green' : 'text-brand-black'}`}>
                    {dayLabel(day)}
                    {isToday && <span className="ml-2 font-dm-sans text-[10px] uppercase tracking-widest text-brand-green">Hoy</span>}
                  </h4>
                </header>

                <div className="space-y-2">
                  {slots.map(({ sp, index }) => {
                    const productId = sp.product?.id ?? null
                    const key = `${productId ?? 'none'}_${dayIso}`
                    const completedList = completedByKey.get(key) ?? []
                    const completed = completedList[index]
                    const productName = sp.product?.name ?? sp.external_product_name ?? 'Producto'

                    return (
                      <div
                        key={`${dayIso}-${sp.id}-${index}`}
                        className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2 flex-wrap"
                      >
                        <span className={`font-dm-sans text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_BADGE[sp.priority]}`}>
                          {PRIORITY_LABEL[sp.priority]}
                        </span>
                        <span className="font-dm-sans text-sm font-semibold text-brand-black flex-1 min-w-0 truncate">
                          {productName}
                          {dailyTarget(sp) > 1 && (
                            <span className="ml-1.5 font-dm-sans text-xs font-normal text-gray-400">
                              · video {index + 1}
                            </span>
                          )}
                        </span>

                        {completed ? (
                          <a
                            href={completed.tiktok_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-dm-sans text-xs font-semibold text-brand-green hover:underline"
                          >
                            <span className="w-5 h-5 rounded-full bg-brand-green text-white flex items-center justify-center shrink-0">
                              <Check size={12} strokeWidth={3} />
                            </span>
                            Ver video
                            <ExternalLink size={12} />
                          </a>
                        ) : isFuture ? (
                          <span className="font-dm-sans text-xs text-gray-300">Pendiente</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPending({ sp, dateIso: dayIso })}
                            className="font-dm-sans text-xs font-semibold bg-brand-green text-white px-3 py-1.5 rounded-lg hover:bg-brand-green/90 transition"
                          >
                            Marcar como publicado
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {loading && (
        <p className="font-dm-sans text-xs text-gray-400 text-center mt-4">Cargando…</p>
      )}

      {pending && (
        <LogVideoModal
          slot={pending}
          onClose={() => setPending(null)}
          onLogged={(row) => {
            // Optimistic insert — `startTransition` keeps the UI responsive
            // while Next revalidates the route in the background.
            startTransition(() => setVideos((v) => [...v, row]))
            setPending(null)
          }}
        />
      )}
    </div>
  )
}

function LogVideoModal({
  slot,
  onClose,
  onLogged,
}: {
  slot: PendingSlot
  onClose: () => void
  onLogged: (row: VideoLogRow) => void
}) {
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [sparkCode, setSparkCode] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const productName = slot.sp.product?.name ?? slot.sp.external_product_name ?? 'Producto'
  const dayHuman = parseDay(slot.dateIso).toLocaleDateString('es-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })

  function submit() {
    if (!tiktokUrl.trim()) {
      setError('Agrega el link de TikTok.')
      return
    }
    setError(null)
    startTransition(async () => {
      const r = await logVideoPostedToday({
        productId: slot.sp.product?.id ?? null,
        strategyProductId: slot.sp.id,
        tiktokUrl,
        sparkCode,
        videoNotes: notes,
        forDate: slot.dateIso,
      })
      if (r.error) {
        setError(r.error)
        return
      }
      // Optimistic row — id is placeholder; the next server refetch
      // (week change) will replace it with the real row.
      const todayKey = new Date().toISOString().split('T')[0]
      const createdAt = slot.dateIso < todayKey
        ? `${slot.dateIso}T12:00:00Z`
        : new Date().toISOString()
      onLogged({
        id: `optimistic-${Date.now()}`,
        product_id: slot.sp.product?.id ?? null,
        tiktok_url: tiktokUrl.trim(),
        spark_code: sparkCode.trim() || null,
        video_notes: notes.trim() || null,
        created_at: createdAt,
      })
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-3xl border border-gray-100 w-full max-w-md p-6 shadow-2xl">
        <div className="text-center mb-5">
          <p className="text-3xl mb-2">🎉</p>
          <h3 className="font-playfair text-2xl text-brand-black">¡Bien hecho!</h3>
          <p className="font-dm-sans text-sm text-gray-500 mt-1">Agrega los detalles de tu video.</p>
          <p className="font-dm-sans text-xs text-gray-400 mt-1 capitalize">
            {productName} · {dayHuman}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Link de TikTok
            </label>
            <input
              type="url"
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@…"
              className="input-field w-full"
              autoFocus
            />
          </div>
          <div>
            <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Código Spark Ads <span className="text-gray-300 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={sparkCode}
              onChange={(e) => setSparkCode(e.target.value)}
              placeholder="#…"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Notas <span className="text-gray-300 font-normal">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Qué hook usaste, cómo te fue, etc."
              rows={2}
              className="input-field w-full resize-none"
            />
          </div>
          {error && (
            <p className="font-dm-sans text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 font-dm-sans text-sm font-medium text-gray-500 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="flex-1 font-dm-sans text-sm font-semibold bg-brand-green text-white px-4 py-2.5 rounded-xl hover:bg-brand-green/90 transition disabled:opacity-50"
          >
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
