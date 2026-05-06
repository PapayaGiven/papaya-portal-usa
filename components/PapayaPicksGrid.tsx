'use client'

import { useState } from 'react'
import { PapayaPick } from '@/lib/types'

const NICHES = ['All', 'Beauty', 'Fashion', 'Hair', 'Skincare', 'Fitness', 'Home', 'Other'] as const

function badge(score: number): { label: string; className: string } | null {
  if (score > 70) return { label: '🔥 Hot Pick', className: 'bg-emerald-100 text-emerald-700 border border-emerald-300' }
  if (score >= 50) return { label: '⭐ Good Pick', className: 'bg-amber-100 text-amber-700 border border-amber-300' }
  return null
}

export default function PapayaPicksGrid({ picks }: { picks: PapayaPick[] }) {
  const [niche, setNiche] = useState<typeof NICHES[number]>('All')
  const filtered = niche === 'All' ? picks : picks.filter((p) => p.niche === niche)

  return (
    <>
      <div className="flex gap-2 flex-wrap mb-6">
        {NICHES.map((n) => (
          <button
            key={n}
            onClick={() => setNiche(n)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${
              niche === n ? 'bg-brand-green text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {n === 'All' ? 'Todas' : n}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-brand-pink/20 p-10 text-center">
          <p className="text-4xl mb-3">🌱</p>
          <p className="font-dm-sans text-gray-500">No hay picks en este nicho por ahora.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((p) => {
          const score = Number(p.papaya_pick_score) || 0
          const b = badge(score)
          return (
            <article key={p.id} className="bg-white rounded-2xl border border-brand-pink/20 shadow-sm overflow-hidden">
              <div className="relative aspect-[16/9] bg-brand-light-pink/40">
                {p.product_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.product_image_url} alt={p.product_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🌟</div>
                )}
                {b && (
                  <span className={`absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full ${b.className}`}>
                    {b.label} · {Math.round(score)}
                  </span>
                )}
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <h3 className="font-playfair text-xl text-brand-black leading-tight">{p.product_name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {p.brand_name && <span className="font-dm-sans text-xs text-gray-500">{p.brand_name}</span>}
                    {p.niche && <span className="font-dm-sans text-xs bg-brand-light-pink text-brand-green px-2 py-0.5 rounded-full">{p.niche}</span>}
                    {p.commission_rate != null && <span className="font-dm-sans text-xs font-bold text-brand-pink">{p.commission_rate}% Comisión</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-dm-sans text-gray-600">
                  <span>📦 {p.units_sold_this_week.toLocaleString('en-US')} unidades esta semana</span>
                  <span>📈 +{Number(p.growth_percentage).toFixed(1)}% crecimiento</span>
                  <span>👥 Solo {p.affiliates_count} afiliadas</span>
                  <span>🎥 {p.videos_count} videos</span>
                </div>
                {p.why_its_a_pick && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Por qué ahora</p>
                    <p className="text-sm text-amber-900 leading-relaxed">{p.why_its_a_pick}</p>
                  </div>
                )}
                {p.example_video_url && (
                  <a href={p.example_video_url} target="_blank" rel="noopener noreferrer" className="block text-xs text-brand-green hover:underline">
                    🎬 Ver video de ejemplo →
                  </a>
                )}
                <div className="flex gap-2">
                  {p.product_link && (
                    <a href={p.product_link} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2 rounded-xl font-dm-sans text-xs font-semibold text-white bg-brand-green hover:bg-brand-green/90 transition">
                      Ver producto →
                    </a>
                  )}
                  {p.sample_link && (
                    <a href={p.sample_link} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2 rounded-xl font-dm-sans text-xs font-semibold text-brand-green bg-brand-green/10 hover:bg-brand-green/20 transition">
                      Solicitar muestra →
                    </a>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
