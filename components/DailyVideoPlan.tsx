'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { logVideoPostedToday } from '@/app/strategy/actions'

interface PlanItem {
  /** strategy_products.id */
  id: string
  product?: { id: string; name: string } | null
  videos_per_day: number | null
  /** 'day' | 'week' — 'week' totals are split / 7 (ceil) for daily target. */
  frequency_type?: 'day' | 'week' | null
  priority: 'Hero' | 'Secondary' | 'Supporting'
}

interface DailyVideoPlanProps {
  items: PlanItem[]
  /** creator_videos posted today, keyed by product_id. */
  completedByProductId: Record<string, number>
}

function dailyTarget(sp: PlanItem): number {
  const raw = sp.videos_per_day ?? 0
  if (raw <= 0) return 0
  return sp.frequency_type === 'week' ? Math.max(1, Math.ceil(raw / 7)) : raw
}

export default function DailyVideoPlan({ items, completedByProductId }: DailyVideoPlanProps) {
  const live = useMemo(() => items.filter((sp) => dailyTarget(sp) > 0), [items])
  const [optimistic, setOptimistic] = useState<Record<string, number>>({})
  const [modalFor, setModalFor] = useState<PlanItem | null>(null)

  const doneFor = (productId?: string | null) =>
    productId ? (completedByProductId[productId] ?? 0) + (optimistic[productId] ?? 0) : 0

  const totalTarget = live.reduce((s, sp) => s + dailyTarget(sp), 0)
  const totalDone = live.reduce((s, sp) => s + Math.min(doneFor(sp.product?.id), dailyTarget(sp)), 0)

  const todayLabel = new Date().toLocaleDateString('es-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (live.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h3 className="font-playfair text-2xl text-brand-black">Tu plan de hoy</h3>
          <p className="font-dm-sans text-xs text-gray-400 capitalize">{todayLabel}</p>
        </div>
        <p className="font-dm-sans text-sm text-gray-500">
          Tu estrategia estará lista pronto. Tu account manager la está preparando.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-playfair text-2xl text-brand-black">Tu plan de hoy</h3>
          <p className="font-dm-sans text-xs text-gray-400 capitalize">{todayLabel}</p>
        </div>
        <span className="font-dm-sans text-xs font-semibold bg-brand-green/10 text-brand-green px-2.5 py-1 rounded-full">
          {totalDone} de {totalTarget} videos
        </span>
      </div>

      <div className="space-y-4">
        {live.map((sp) => {
          const target = dailyTarget(sp)
          const done = Math.min(doneFor(sp.product?.id), target)
          const isHero = sp.priority === 'Hero'
          return (
            <div key={sp.id} className="border-t border-gray-50 pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`font-dm-sans text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      isHero ? 'bg-amber-100 text-amber-700' : 'bg-brand-pink/15 text-brand-pink'
                    }`}
                  >
                    {isHero ? 'Hero' : 'Sub-hero'}
                  </span>
                  <p className="font-dm-sans font-semibold text-brand-black text-sm truncate">
                    {sp.product?.name ?? 'Producto'}
                  </p>
                </div>
                <span className="font-dm-sans text-xs text-gray-500">
                  {done}/{target} hoy
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {Array.from({ length: target }).map((_, i) => {
                  const checked = i < done
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={checked}
                      onClick={() => setModalFor(sp)}
                      aria-label={checked ? `Video ${i + 1} publicado` : `Marcar video ${i + 1}`}
                      className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition ${
                        checked
                          ? 'bg-brand-green border-brand-green text-white'
                          : 'border-gray-200 hover:border-brand-green text-gray-400 hover:text-brand-green'
                      }`}
                    >
                      {checked ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="font-dm-sans text-xs font-bold">{i + 1}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between flex-wrap gap-2">
        <p className="font-dm-sans text-xs text-gray-500">
          {totalDone === totalTarget && totalTarget > 0
            ? '🎉 ¡Plan completo de hoy!'
            : `${totalTarget - totalDone} video${totalTarget - totalDone === 1 ? '' : 's'} pendiente${totalTarget - totalDone === 1 ? '' : 's'}.`}
        </p>
        <Link href="/strategy" className="font-dm-sans text-xs font-semibold text-brand-green hover:underline">
          Ver estrategia completa →
        </Link>
      </div>

      {modalFor && (
        <VideoLogModal
          item={modalFor}
          onClose={() => setModalFor(null)}
          onLogged={() => {
            const productId = modalFor.product?.id
            if (productId) {
              setOptimistic((p) => ({ ...p, [productId]: (p[productId] ?? 0) + 1 }))
            }
            setModalFor(null)
          }}
        />
      )}
    </div>
  )
}

function VideoLogModal({
  item,
  onClose,
  onLogged,
}: {
  item: PlanItem
  onClose: () => void
  onLogged: () => void
}) {
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [sparkCode, setSparkCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    if (!tiktokUrl.trim()) {
      setError('Agrega el link de TikTok.')
      return
    }
    setError(null)
    startTransition(async () => {
      const r = await logVideoPostedToday({
        productId: item.product?.id ?? null,
        strategyProductId: item.id,
        tiktokUrl,
        sparkCode,
      })
      if (r.error) setError(r.error)
      else onLogged()
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
          <p className="font-dm-sans text-sm text-gray-500 mt-1">Agrega el link de tu video.</p>
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
            {isPending ? 'Guardando…' : 'Guardar video'}
          </button>
        </div>
      </div>
    </div>
  )
}
