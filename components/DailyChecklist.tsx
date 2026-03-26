'use client'

import { useState, useTransition } from 'react'
import { toggleChecklistItem } from '@/app/strategy/actions'

interface StrategyProductItem {
  id: string
  product?: { name: string } | null
  videos_per_day: number | null
  live_hours_per_week: number | null
}

interface ChecklistEntry {
  strategy_product_id: string
  video_posted: boolean
  live_done: boolean
}

interface DailyChecklistProps {
  creatorId: string
  strategyProducts: StrategyProductItem[]
  checklistEntries: ChecklistEntry[]
}

export default function DailyChecklist({ creatorId, strategyProducts, checklistEntries }: DailyChecklistProps) {
  const [isPending, startTransition] = useTransition()

  const entryMap = new Map(checklistEntries.map((e) => [e.strategy_product_id, e]))

  // Build checklist items
  const items: { productId: string; productName: string; field: 'video_posted' | 'live_done'; label: string; done: boolean }[] = []
  for (const sp of strategyProducts) {
    const name = sp.product?.name ?? 'Product'
    const entry = entryMap.get(sp.id)
    if ((sp.videos_per_day ?? 0) > 0) {
      items.push({
        productId: sp.id,
        productName: name,
        field: 'video_posted',
        label: `Did you post your ${name} video today?`,
        done: entry?.video_posted ?? false,
      })
    }
    if ((sp.live_hours_per_week ?? 0) > 0) {
      items.push({
        productId: sp.id,
        productName: name,
        field: 'live_done',
        label: `Did you go live today? (${sp.live_hours_per_week}h/week target — ${name})`,
        done: entry?.live_done ?? false,
      })
    }
  }

  const [localDone, setLocalDone] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((item) => [`${item.productId}_${item.field}`, item.done]))
  )

  if (items.length === 0) return null

  const completedCount = Object.values(localDone).filter(Boolean).length
  const allDone = completedCount === items.length

  function handleToggle(productId: string, field: 'video_posted' | 'live_done', current: boolean) {
    const key = `${productId}_${field}`
    setLocalDone((prev) => ({ ...prev, [key]: !current }))
    startTransition(async () => {
      const result = await toggleChecklistItem(creatorId, productId, field, !current)
      if (result.error) {
        // Revert on error
        setLocalDone((prev) => ({ ...prev, [key]: current }))
      }
    })
  }

  return (
    <div className={`rounded-2xl border p-6 transition-colors ${allDone ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-dm-sans font-semibold text-brand-black text-base">Daily Checklist</h3>
          <p className={`font-dm-sans text-xs mt-0.5 ${allDone ? 'text-emerald-600' : 'text-amber-600'}`}>
            {allDone ? '🎉 All done for today!' : "Check off what you've completed today."}
          </p>
        </div>
        <span className={`font-dm-sans text-xs font-semibold px-2.5 py-1 rounded-full ${allDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {completedCount}/{items.length}
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const key = `${item.productId}_${item.field}`
          const done = localDone[key] ?? item.done
          return (
            <div
              key={key}
              className={`flex items-center gap-3 p-3 rounded-xl bg-white/70 transition-opacity ${done ? 'opacity-60' : 'opacity-100'}`}
            >
              <button
                onClick={() => handleToggle(item.productId, item.field, done)}
                disabled={isPending}
                className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all disabled:opacity-50 ${
                  done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-brand-green'
                }`}
                aria-label={done ? 'Mark as not done' : 'Mark as done'}
              >
                {done && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <p className={`font-dm-sans text-sm font-medium flex-1 ${done ? 'line-through text-gray-400' : 'text-brand-black'}`}>
                {item.label}
              </p>
            </div>
          )
        })}
      </div>

      <p className="font-dm-sans text-xs text-gray-400 mt-3">Resets every day at midnight.</p>
    </div>
  )
}
