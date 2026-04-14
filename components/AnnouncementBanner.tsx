'use client'

import { useState } from 'react'

interface Announcement {
  id: string
  title: string
  body: string | null
  image_url: string | null
  created_at: string
}

export default function AnnouncementBanner({ announcements }: { announcements: Announcement[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [modalAnnouncement, setModalAnnouncement] = useState<Announcement | null>(null)

  const visible = announcements.filter((a) => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <>
      <div className="space-y-3">
        {visible.map((a) => (
          <div
            key={a.id}
            className="w-full border border-purple-200 bg-purple-50 rounded-xl px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-purple-100/70 transition"
            onClick={() => setModalAnnouncement(a)}
          >
            <span className="text-lg shrink-0 mt-0.5">📢</span>
            <div className="flex-1 min-w-0">
              <p className="font-dm-sans font-semibold text-sm text-purple-800">{a.title}</p>
              {a.body && (
                <p className="font-dm-sans text-sm mt-0.5 text-purple-700 opacity-80 line-clamp-1">{a.body}</p>
              )}
            </div>
            {a.image_url && (
              <img src={a.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-purple-200" />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setDismissed((prev) => new Set(prev).add(a.id)) }}
              className="shrink-0 mt-0.5 text-purple-400 hover:text-purple-600 transition"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalAnnouncement && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
          onClick={() => setModalAnnouncement(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {modalAnnouncement.image_url && (
              <img
                src={modalAnnouncement.image_url}
                alt={modalAnnouncement.title}
                className="w-full h-56 object-cover rounded-t-2xl"
              />
            )}
            <div className="p-6">
              <h2 className="font-playfair text-2xl text-brand-black mb-2">{modalAnnouncement.title}</h2>
              {modalAnnouncement.body && (
                <p className="font-dm-sans text-sm text-gray-700 leading-relaxed whitespace-pre-line">{modalAnnouncement.body}</p>
              )}
              <p className="font-dm-sans text-xs text-gray-400 mt-4">
                {new Date(modalAnnouncement.created_at).toLocaleDateString('es-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <button
                onClick={() => setModalAnnouncement(null)}
                className="mt-4 font-dm-sans text-sm font-semibold bg-brand-black text-white px-5 py-2.5 rounded-xl hover:bg-brand-black/80 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
