'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Ungültige E-Mail oder Passwort. Bitte versuche es erneut.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-brand-light-pink flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-brand-pink/20 p-10">
          {/* Logo & brand */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">☀️</div>
            <p className="font-dm-sans text-xs uppercase tracking-[0.25em] text-gray-400 mb-3">
              Papaya Social Club
            </p>
            <h1 className="font-playfair text-4xl text-brand-green leading-tight">
              Welcome back.
            </h1>
            <p className="font-dm-sans text-gray-500 mt-2 text-sm">
              Dein Creator-Dashboard wartet.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5"
              >
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="deine@email.de"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink font-dm-sans text-sm bg-gray-50 text-gray-900 placeholder-gray-400 transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5"
              >
                Passwort
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
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
              {loading ? 'Einloggen...' : 'Einloggen →'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 font-dm-sans mt-6">
            Noch kein Account? Du wirst von deiner Agentur eingeladen.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 font-dm-sans mt-6">
          © 2024 Papaya Social Club · Alle Rechte vorbehalten
        </p>
      </div>
    </div>
  )
}
