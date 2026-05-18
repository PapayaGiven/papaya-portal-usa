'use client'

import { useState } from 'react'
import ProductCard from '@/components/ProductCard'
import PapayaPicksGrid from '@/components/PapayaPicksGrid'
import type { Product, PapayaPick } from '@/lib/types'

/**
 * Two-tab wrapper for /products. Replaces the standalone /papaya-picks
 * page — Papaya Picks now lives behind the second tab here so the nav
 * stays at 5 items.
 *
 * The level gate (no Papaya Picks for Initiation) is enforced by the
 * server page — `picksAccessible=false` simply hides the tab.
 */
export default function ProductsTabs({
  products,
  picks,
  picksAccessible,
}: {
  products: Product[]
  picks: PapayaPick[]
  picksAccessible: boolean
}) {
  const [tab, setTab] = useState<'products' | 'picks'>('products')

  return (
    <div>
      <div role="tablist" aria-label="Vista de productos" className="flex gap-1.5 border-b border-brand-pink/15 mb-6">
        <TabButton active={tab === 'products'} onClick={() => setTab('products')}>
          Productos
        </TabButton>
        {picksAccessible && (
          <TabButton active={tab === 'picks'} onClick={() => setTab('picks')}>
            Papaya Picks 🌟
          </TabButton>
        )}
      </div>

      {tab === 'products' && (
        products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-brand-pink/20 p-10 text-center">
            <p className="text-4xl mb-3">📦</p>
            <h2 className="font-playfair text-2xl text-brand-black mb-2">Aún no hay productos en tu catálogo.</h2>
            <p className="font-dm-sans text-gray-500 text-sm">
              Cuando admin agregue productos a tu nivel, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )
      )}

      {tab === 'picks' && picksAccessible && (
        <div>
          <p className="font-dm-sans text-sm text-gray-500 mb-5">
            Productos con alta demanda y poca competencia — sé la primera.
          </p>
          <PapayaPicksGrid picks={picks} />
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-4 py-2 font-dm-sans text-sm font-medium border-b-2 -mb-px transition ${
        active
          ? 'border-brand-green text-brand-green'
          : 'border-transparent text-gray-500 hover:text-brand-black'
      }`}
    >
      {children}
    </button>
  )
}
