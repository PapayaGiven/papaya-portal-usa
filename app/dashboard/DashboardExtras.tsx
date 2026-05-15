'use client'

import { useState, useTransition } from 'react'
import { markNotificationRead, setDeliverableStatus } from './actions'

interface Notification {
  id: string
  title: string
  message: string | null
  type: string | null
  created_at: string
}

interface Deliverable {
  id: string
  brand_name: string
  deliverable_type: string
  due_date: string | null
  status: string
  notes: string | null
}

// Stacks the unread-notifications banner and the "Tus pendientes" card.
// Both are interactive (dismiss / mark done) so they live in a client
// component; the dashboard page fetches the rows server-side and hands
// them in as props.
export default function DashboardExtras({
  notifications,
  deliverables,
}: {
  notifications: Notification[]
  deliverables: Deliverable[]
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [doneLocal, setDoneLocal] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const visibleNotifs = notifications.filter((n) => !dismissed.has(n.id))
  const visibleDeliverables = deliverables.filter((d) => !doneLocal.has(d.id) && d.status !== 'done')

  if (visibleNotifs.length === 0 && visibleDeliverables.length === 0) return null

  return (
    <div className="space-y-3 mb-6">
      {visibleNotifs.map((n) => (
        <div
          key={n.id}
          className="bg-brand-pink/10 border-2 border-brand-pink/40 rounded-2xl p-4 flex items-start gap-3"
        >
          <span className="text-xl shrink-0" aria-hidden>🔔</span>
          <div className="flex-1 min-w-0">
            <p className="font-dm-sans font-bold text-sm text-brand-black">{n.title}</p>
            {n.message && <p className="font-dm-sans text-xs text-gray-600 mt-0.5">{n.message}</p>}
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              // Optimistically hide; persist mark-as-read in the background.
              setDismissed((prev) => new Set(prev).add(n.id))
              startTransition(async () => {
                await markNotificationRead(n.id)
              })
            }}
            className="text-brand-black/40 hover:text-brand-black text-lg leading-none shrink-0"
            title="Marcar como leído"
          >×</button>
        </div>
      ))}

      {visibleDeliverables.length > 0 && (
        <div className="bg-white border border-brand-pink/30 rounded-2xl p-4">
          <h3 className="font-playfair text-lg text-brand-black mb-2">📋 Tus pendientes</h3>
          <ul className="divide-y divide-gray-100">
            {visibleDeliverables.map((d) => (
              <li key={d.id} className="py-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => {
                    setDoneLocal((prev) => new Set(prev).add(d.id))
                    startTransition(async () => {
                      await setDeliverableStatus(d.id, 'done')
                    })
                  }}
                  className="accent-brand-green w-4 h-4 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-dm-sans text-sm text-brand-black truncate">
                    <strong>{d.brand_name}</strong> · {d.deliverable_type}
                  </p>
                  {(d.due_date || d.notes) && (
                    <p className="font-dm-sans text-xs text-gray-500 mt-0.5">
                      {d.due_date && <>📅 {new Date(d.due_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</>}
                      {d.due_date && d.notes && ' · '}
                      {d.notes}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
