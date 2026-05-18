'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import ViolationForm from '@/components/ViolationForm'

/**
 * Subtle "¿Tienes una violación?" entry point. Lives at the bottom of
 * the Estrategia page so it's reachable but doesn't compete with the
 * page's primary content. Opens the existing ViolationForm in a modal
 * — no navigation away from /strategy.
 */
export default function ViolationModalTrigger() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="text-center py-6">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 font-dm-sans text-xs text-gray-500 hover:text-red-600 underline underline-offset-4 decoration-gray-300 hover:decoration-red-300 transition"
        >
          <AlertTriangle size={14} strokeWidth={1.75} />
          ¿Tienes una violación? Repórtala aquí
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-playfair text-xl text-brand-black">Reportar una violación</h2>
                <p className="font-dm-sans text-xs text-gray-500 mt-0.5">
                  Cuéntanos qué pasó. Nuestro equipo lo revisa en privado.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-gray-400 hover:text-brand-black transition"
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>
            <div className="p-6">
              <ViolationForm />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
