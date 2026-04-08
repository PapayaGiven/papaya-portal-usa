'use client'

import { useState } from 'react'

interface CreativeBankProps {
  products: {
    id: string
    productName: string
    hooks: string[]
    scripts: string | null
    trends: string | null
  }[]
}

export default function CreativeBank({ products }: CreativeBankProps) {
  const [expandedId, setExpandedId] = useState<string | null>(products[0]?.id ?? null)

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-brand-pink/20 p-10 text-center">
        <p className="text-4xl mb-3">💡</p>
        <h2 className="font-playfair text-2xl text-brand-black mb-2">Banco creativo</h2>
        <p className="font-dm-sans text-gray-500 text-sm">
          Tu agencia agregará contenido creativo pronto.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-xl">💡</div>
        <div>
          <h3 className="font-dm-sans font-semibold text-sm text-brand-black">Banco creativo</h3>
          <p className="font-dm-sans text-xs text-gray-400">Ideas, hooks y scripts para tus productos</p>
        </div>
      </div>

      {products.map((product) => {
        const isExpanded = expandedId === product.id
        const hasContent = product.hooks.length > 0 || product.scripts || product.trends

        return (
          <div key={product.id} className="bg-white rounded-2xl border border-brand-pink/20 overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : product.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition"
            >
              <span className="font-dm-sans font-semibold text-brand-black">{product.productName}</span>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && hasContent && (
              <div className="px-6 pb-5 space-y-5 border-t border-gray-50">
                {product.hooks.length > 0 && (
                  <div className="pt-4">
                    <h4 className="font-dm-sans text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Hooks sugeridos</h4>
                    <ul className="space-y-1.5">
                      {product.hooks.map((hook, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-brand-pink mt-0.5 shrink-0">•</span>
                          <span className="font-dm-sans text-sm text-gray-700">{hook}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {product.scripts && (
                  <div>
                    <h4 className="font-dm-sans text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Scripts de ejemplo</h4>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="font-dm-sans text-sm text-gray-700 whitespace-pre-line">{product.scripts}</p>
                    </div>
                  </div>
                )}

                {product.trends && (
                  <div>
                    <h4 className="font-dm-sans text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Tendencias actuales</h4>
                    <p className="font-dm-sans text-sm text-gray-700 whitespace-pre-line">{product.trends}</p>
                  </div>
                )}
              </div>
            )}

            {isExpanded && !hasContent && (
              <div className="px-6 pb-5 border-t border-gray-50 pt-4">
                <p className="font-dm-sans text-sm text-gray-400 text-center">Aún no hay contenido creativo para este producto.</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
