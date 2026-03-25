'use client'

import { useState, useTransition } from 'react'
import { adminLogin } from '@/app/admin/actions'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await adminLogin(password)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-10 text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <p className="font-dm-sans text-xs uppercase tracking-[0.25em] text-white/40 mb-2">
            Papaya Social Club
          </p>
          <h1 className="font-playfair text-3xl text-white mb-1">Admin Panel</h1>
          <p className="font-dm-sans text-white/40 text-sm mb-8">Nur für das Papaya-Team.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin-Passwort"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition"
            />

            {error && (
              <p className="font-dm-sans text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 rounded-xl font-dm-sans font-semibold text-sm text-brand-black bg-brand-pink hover:bg-brand-pink/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Einloggen...' : 'Einloggen →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
