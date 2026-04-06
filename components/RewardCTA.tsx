'use client'

import { useState, useTransition } from 'react'
import { claimReward } from '@/app/mi-progreso/actions'

interface RewardCTAProps {
  rewardId: string
  ctaType: 'link' | 'none' | 'whatsapp' | string
  ctaText: string | null
  ctaUrl: string | null
  requiresAddress: boolean
  isClaimed: boolean
  isLocked: boolean
  accountManagerWhatsapp: string | null
}

export default function RewardCTA({
  rewardId,
  ctaType,
  ctaText,
  ctaUrl,
  requiresAddress,
  isClaimed,
  isLocked,
  accountManagerWhatsapp,
}: RewardCTAProps) {
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({ shipping_name: '', shipping_phone: '', shipping_address: '' })
  const [error, setError] = useState<string | null>(null)
  const [justClaimed, setJustClaimed] = useState(false)

  if (isClaimed || justClaimed) {
    return (
      <span className="inline-flex items-center gap-1 font-dm-sans text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
        ✓ Reclamado
      </span>
    )
  }

  if (isLocked) {
    return (
      <button
        disabled
        className="font-dm-sans text-xs font-semibold px-4 py-2 rounded-full bg-gray-100 text-gray-400 cursor-not-allowed"
      >
        🔒 Bloqueado
      </button>
    )
  }

  if (ctaType === 'none') {
    return (
      <button
        disabled
        className="font-dm-sans text-xs font-semibold px-4 py-2 rounded-full bg-emerald-50 text-emerald-600 cursor-default"
      >
        Activado
      </button>
    )
  }

  function handleClick() {
    if (requiresAddress) {
      setShowModal(true)
      return
    }

    if (ctaType === 'link' && ctaUrl) {
      window.open(ctaUrl, '_blank', 'noopener,noreferrer')
      return
    }

    if (ctaType === 'whatsapp') {
      const waUrl = ctaUrl || (accountManagerWhatsapp ? `https://wa.me/${accountManagerWhatsapp.replace(/\D/g, '')}` : null)
      if (waUrl) {
        window.open(waUrl, '_blank', 'noopener,noreferrer')
      }
      return
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await claimReward(rewardId, formData)
      if (result.error) {
        setError(result.error)
      } else {
        setJustClaimed(true)
        setShowModal(false)
      }
    })
  }

  return (
    <>
      <button
        onClick={handleClick}
        data-reward-id={rewardId}
        data-requires-address={requiresAddress}
        data-cta-type={ctaType}
        className="font-dm-sans text-xs font-semibold px-4 py-2 rounded-full bg-brand-pink text-white hover:opacity-90 transition-opacity"
      >
        {ctaText || 'Reclamar'}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="font-playfair text-xl text-brand-black mb-1">Datos de envío</h3>
            <p className="font-dm-sans text-sm text-gray-500 mb-5">
              Completa tus datos para recibir tu recompensa.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-dm-sans text-sm font-medium text-gray-700 block mb-1">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={formData.shipping_name}
                  onChange={(e) => setFormData({ ...formData, shipping_name: e.target.value })}
                  className="w-full font-dm-sans text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-pink/30 focus:border-brand-pink"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="font-dm-sans text-sm font-medium text-gray-700 block mb-1">Teléfono</label>
                <input
                  type="tel"
                  required
                  value={formData.shipping_phone}
                  onChange={(e) => setFormData({ ...formData, shipping_phone: e.target.value })}
                  className="w-full font-dm-sans text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-pink/30 focus:border-brand-pink"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="font-dm-sans text-sm font-medium text-gray-700 block mb-1">Dirección de envío</label>
                <textarea
                  required
                  value={formData.shipping_address}
                  onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                  rows={3}
                  className="w-full font-dm-sans text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-pink/30 focus:border-brand-pink resize-none"
                  placeholder="Calle, ciudad, estado, código postal"
                />
              </div>

              {error && (
                <p className="font-dm-sans text-xs text-red-500">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 font-dm-sans text-sm font-semibold px-4 py-2.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 font-dm-sans text-sm font-semibold px-4 py-2.5 rounded-full bg-brand-pink text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isPending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
