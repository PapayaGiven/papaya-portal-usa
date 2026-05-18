'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import type { Product } from '@/lib/types'

/**
 * Hack-portal product grid with search + niche pill filters.
 *
 * The brief lists five niche pills: Beauty / Fashion / Hair / Skincare /
 * Fitness. Match products case-insensitively against those buckets so
 * a "beauty" / "Beauty " / "BEAUTY" niche all bucket together.
 */
const NICHES = ['All', 'Beauty', 'Fashion', 'Hair', 'Skincare', 'Fitness'] as const
type Niche = (typeof NICHES)[number]

export default function HackProductsSection({ products }: { products: Product[] }) {
  const [search, setSearch] = useState('')
  const [niche, setNiche] = useState<Niche>('All')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (niche !== 'All') {
        if ((p.niche ?? '').toLowerCase().trim() !== niche.toLowerCase()) return false
      }
      if (q) {
        const hay = `${p.name ?? ''} ${p.niche ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [products, search, niche])

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-playfair text-3xl text-brand-black">Productos</h2>
          <p className="font-dm-sans text-sm text-gray-500 mt-1">
            Solicita muestras de las marcas que trabajamos. {products.length} en catálogo.
          </p>
        </div>
        <span className="font-dm-sans text-xs text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-full">
          {filtered.length} de {products.length}
        </span>
      </div>

      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o nicho…"
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 font-dm-sans text-sm placeholder:text-gray-400 focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 mb-3"
      />

      {/* Niche filter pills */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {NICHES.map((n) => {
          const active = niche === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => setNiche(n)}
              className={`font-dm-sans text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                active
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-green/40'
              }`}
            >
              {n}
            </button>
          )
        })}
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-12 font-dm-sans text-sm">
          Ningún producto coincide con esa búsqueda.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <article
              key={p.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col"
            >
              <div className="relative aspect-square bg-brand-light-pink/40">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                    <Image
                      src="https://nptkinihgouicdimytbf.supabase.co/storage/v1/object/public/PSC%20LOGOS/Sun_pink.png"
                      alt=""
                      width={48}
                      height={48}
                      className="opacity-30"
                    />
                  </div>
                )}
                {p.commission_rate != null && (
                  <span className="absolute top-2 right-2 font-dm-sans text-xs font-bold bg-brand-pink text-white px-2.5 py-1 rounded-full shadow-sm">
                    {p.commission_rate}%
                  </span>
                )}
              </div>
              <div className="p-3 flex flex-col gap-2 flex-1">
                {p.niche && (
                  <span className="font-dm-sans text-[10px] font-medium bg-brand-light-pink text-brand-green px-2 py-0.5 rounded-full self-start">
                    {p.niche}
                  </span>
                )}
                <p className="font-dm-sans font-semibold text-brand-black text-sm leading-snug line-clamp-2">
                  {p.name}
                </p>
                {p.sample_link ? (
                  <a
                    href={p.sample_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex items-center justify-center font-dm-sans text-xs font-bold bg-brand-green/10 text-brand-green hover:bg-brand-green hover:text-white border border-brand-green/30 px-3 py-2 rounded-xl transition"
                  >
                    Solicitar muestra
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-auto font-dm-sans text-xs font-bold bg-gray-50 text-gray-300 border border-gray-100 px-3 py-2 rounded-xl cursor-not-allowed"
                  >
                    Sin muestra
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
