'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Detect invite tokens in hash and redirect to /auth/confirm
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('type=invite')) {
      console.log('[login] Invite token detected in hash, redirecting to /auth/confirm')
      router.replace('/auth/confirm' + hash)
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email o contraseña incorrectos. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
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
            <p className="font-dm-sans text-xs font-semibold text-white px-3 py-1 rounded-full inline-block mb-3" style={{ backgroundColor: '#F4A7C3' }}>Papaya Social Club — USA 🇺🇸</p>
            <h1 className="font-playfair text-4xl text-brand-green leading-tight">Bienvenida de nuevo.</h1>
            <p className="font-dm-sans text-gray-500 mt-2 text-sm">Tu dashboard te espera.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@ejemplo.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink font-dm-sans text-sm bg-gray-50 text-gray-900 placeholder-gray-400 transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••��•••"
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
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión →'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 font-dm-sans mt-6">
            ¿No tienes cuenta? Tu agencia te enviará una invitación.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 font-dm-sans mt-6">
          © 2024 Papaya Social Club · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
