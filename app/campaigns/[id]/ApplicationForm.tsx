'use client'

import { useState, useTransition } from 'react'
import { submitCampaignApplication } from '@/app/campaigns/actions'

export default function ApplicationForm({ campaignId }: { campaignId: string }) {
  const [form, setForm] = useState({ posts_offered: '', live_hours_offered: '', price_offered: '' })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitCampaignApplication({
        campaign_id: campaignId,
        posts_offered: parseInt(form.posts_offered) || 0,
        live_hours_offered: parseFloat(form.live_hours_offered) || 0,
        price_offered: parseFloat(form.price_offered) || 0,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSubmitted(true)
      }
    })
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="font-playfair text-xl text-brand-black mb-1">Bewerbung eingegangen!</h3>
        <p className="font-dm-sans text-sm text-gray-500">Wir melden uns bei dir, sobald deine Bewerbung geprüft wurde.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-dm-sans text-sm font-medium text-gray-700 mb-1.5">
          Anzahl Posts
        </label>
        <input
          type="number"
          min="1"
          required
          value={form.posts_offered}
          onChange={(e) => setForm((f) => ({ ...f, posts_offered: e.target.value }))}
          placeholder="z.B. 3"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink font-dm-sans text-sm bg-gray-50 text-gray-900 placeholder-gray-400 transition"
        />
      </div>

      <div>
        <label className="block font-dm-sans text-sm font-medium text-gray-700 mb-1.5">
          Live-Stunden
        </label>
        <input
          type="number"
          min="0"
          step="0.5"
          required
          value={form.live_hours_offered}
          onChange={(e) => setForm((f) => ({ ...f, live_hours_offered: e.target.value }))}
          placeholder="z.B. 2.5"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink font-dm-sans text-sm bg-gray-50 text-gray-900 placeholder-gray-400 transition"
        />
      </div>

      <div>
        <label className="block font-dm-sans text-sm font-medium text-gray-700 mb-1.5">
          Dein Angebot (€)
        </label>
        <input
          type="number"
          min="0"
          step="10"
          required
          value={form.price_offered}
          onChange={(e) => setForm((f) => ({ ...f, price_offered: e.target.value }))}
          placeholder="z.B. 150"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink font-dm-sans text-sm bg-gray-50 text-gray-900 placeholder-gray-400 transition"
        />
      </div>

      {error && (
        <div className="bg-brand-pink/10 border border-brand-pink/30 rounded-xl px-4 py-3">
          <p className="text-sm font-dm-sans text-rose-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3.5 rounded-xl font-dm-sans font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
        style={{ backgroundColor: '#1B5E3B' }}
      >
        {isPending ? 'Wird gesendet...' : 'Bewerbung absenden →'}
      </button>
    </form>
  )
}
