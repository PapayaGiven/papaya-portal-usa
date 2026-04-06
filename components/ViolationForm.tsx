'use client'

import { useState, useRef } from 'react'
import { submitViolation } from '@/app/violations/actions'

export default function ViolationForm() {
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = description.trim()
    if (!trimmed) return

    setStatus('loading')
    setErrorMessage('')

    const result = await submitViolation(trimmed)

    if (result.error) {
      setStatus('error')
      setErrorMessage(result.error)
    } else {
      setStatus('success')
      setDescription('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="violation-description"
          className="font-dm-sans text-sm font-medium text-brand-black"
        >
          Describe la violación y por qué crees que no es correcta
        </label>
        <textarea
          id="violation-description"
          ref={textareaRef}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            if (status !== 'idle') setStatus('idle')
          }}
          rows={5}
          required
          placeholder="Explica con detalle qué ocurrió y por qué consideras que esta violación es injusta..."
          className="font-dm-sans text-sm text-brand-black placeholder-gray-400 bg-brand-light-pink border border-brand-pink/30 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green transition"
        />
      </div>

      {status === 'success' && (
        <div className="flex items-start gap-3 bg-brand-green/5 border border-brand-green/20 rounded-xl px-4 py-3">
          <span className="text-brand-green mt-0.5 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <p className="font-dm-sans text-sm text-brand-green font-medium">
            Tu violación fue enviada exitosamente. Nuestro equipo la revisará pronto.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span className="text-red-500 mt-0.5 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <p className="font-dm-sans text-sm text-red-600">
            {errorMessage || 'Ocurrió un error. Intenta de nuevo.'}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !description.trim()}
        className="self-start font-dm-sans text-sm font-semibold bg-brand-green text-white px-6 py-2.5 rounded-xl hover:bg-brand-green/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {status === 'loading' ? 'Enviando...' : 'Enviar reporte'}
      </button>
    </form>
  )
}
