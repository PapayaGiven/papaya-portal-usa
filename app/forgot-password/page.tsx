'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/confirm`
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    if (resetErr) {
      setError(resetErr.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-brand-light-pink flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-sm border border-brand-pink/20 p-10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image
                src="https://nptkinihgouicdimytbf.supabase.co/storage/v1/object/public/PSC%20LOGOS/logo_pink.png"
                alt="Papaya Social Club"
                width={80}
                height={80}
              />
            </div>
            <h1 className="font-playfair text-3xl text-brand-green leading-tight">
              {success ? 'Revisa tu email' : '¿Olvidaste tu contraseña?'}
            </h1>
            <p className="font-dm-sans text-gray-500 mt-2 text-sm">
              {success
                ? 'Te enviamos un email para restablecer tu contraseña.'
                : 'Ingresa tu email para restablecer tu contraseña.'}
            </p>
          </div>

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
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
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-dm-sans font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] mt-2"
                style={{ backgroundColor: '#1B5E3B' }}
              >
                {loading ? 'Enviando...' : 'Enviar email →'}
              </button>
            </form>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center">
              <p className="text-sm font-dm-sans text-emerald-700">
                Te enviamos un email para restablecer tu contraseña.
              </p>
            </div>
          )}

          <Link
            href="/login"
            className="block w-full text-center mt-6 py-2 font-dm-sans text-sm text-gray-500 hover:text-brand-green transition"
          >
            ← Volver al inicio de sesión
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 font-dm-sans mt-6">
          © 2024 Papaya Social Club · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
