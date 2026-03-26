'use client'

import { useState, useTransition } from 'react'
import { Product } from '@/lib/types'
import { saveInitiationProducts } from '@/app/products/actions'

interface InitiationProductModalProps {
  products: Product[]
  creatorId: string
}

export default function InitiationProductModal({ products, creatorId }: InitiationProductModalProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (done) return null

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    )
  }

  function handleSave() {
    if (selected.length !== 3) {
      setError('Please select exactly 3 products.')
      return
    }
    setError(null)
    startTransition(async () => {
      const r = await saveInitiationProducts(creatorId, selected)
      if (r.error) {
        setError(r.error)
      } else {
        setDone(true)
        window.location.reload()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl border border-brand-pink/20 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-5 text-center border-b border-gray-50">
          <div className="text-4xl mb-3">🌱</div>
          <h2 className="font-playfair text-2xl text-brand-black mb-2">Choose Your 3 Products</h2>
          <p className="font-dm-sans text-sm text-gray-500">
            As an Initiation creator, you start with 3 products. Your agency picked the best ones for you.
            Choose the ones you&apos;re most excited to promote.
          </p>
        </div>

        {/* Products */}
        <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
          {products.map((product) => {
            const isSelected = selected.includes(product.id)
            const isDisabled = !isSelected && selected.length >= 3
            return (
              <button
                key={product.id}
                onClick={() => !isDisabled && toggle(product.id)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition text-left ${
                  isSelected
                    ? 'border-brand-green bg-brand-green/5'
                    : isDisabled
                    ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                    : 'border-gray-100 hover:border-brand-pink/40 hover:bg-brand-light-pink/30'
                }`}
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-brand-light-pink flex items-center justify-center shrink-0">
                    <span className="font-playfair text-xl text-brand-pink">{product.name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-dm-sans font-semibold text-sm text-brand-black truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {product.niche && (
                      <span className="font-dm-sans text-xs text-gray-400">{product.niche}</span>
                    )}
                    {product.commission_rate != null && (
                      <span className="font-dm-sans text-xs font-bold text-brand-pink">
                        {product.commission_rate}%
                      </span>
                    )}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                  isSelected ? 'border-brand-green bg-brand-green' : 'border-gray-200'
                }`}>
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-4 border-t border-gray-50">
          <div className="flex items-center justify-between mb-4">
            <span className="font-dm-sans text-sm text-gray-500">
              {selected.length} / 3 selected
            </span>
            {error && <p className="font-dm-sans text-xs text-rose-600">{error}</p>}
          </div>
          <button
            onClick={handleSave}
            disabled={isPending || selected.length !== 3}
            className="w-full py-3.5 rounded-xl font-dm-sans font-semibold text-sm text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: '#1B5E3B' }}
          >
            {isPending ? 'Saving...' : 'Start with these products →'}
          </button>
        </div>
      </div>
    </div>
  )
}
