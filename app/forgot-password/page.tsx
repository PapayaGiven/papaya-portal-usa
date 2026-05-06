'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordWithAccessCode } from '@/app/admin/actions'

type Mode = 'choice' | 'email' | 'code'

function formatCode(value: string): string {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const parts: string[] = []
  if (cleaned.length > 0) parts.push(cleaned.slice(0, 3))
  if (cleaned.length > 3) parts.push(cleaned.slice(3, 6))
  if (cleaned.length > 6) parts.push(cleaned.slice(6, 9))
  return parts.join('-')
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('choice')

  // Email mode state
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // Code mode state
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Shared
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  async function handleEmailReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/confirm`
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    setLoading(false)
    if (resetErr) {
      setError(resetErr.message)
      return
    }
    setEmailSent(true)
  }

  async function handleCodeReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const result = await resetPasswordWithAccessCode(code, newPassword)
    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    router.push('/login?reset=success')
  }

  return (
    <div className="min-h-screen bg-brand-light-pink flex items-center justify-center px-4 py-8">
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
              {emailSent ? 'Revisa tu email' : '¿Olvidaste tu contraseña?'}
            </h1>
            <p className="font-dm-sans text-gray-500 mt-2 text-sm">
              {emailSent
                ? 'Te enviamos un email para restablecer tu contraseña.'
                : mode === 'choice'
                  ? '¿Cómo quieres restablecerla?'
                  : mode === 'email'
                    ? 'Ingresa tu email para recibir un enlace.'
                    : 'Ingresa tu código de acceso y crea una nueva contraseña.'}
            </p>
          </div>

          {/* Choice screen */}
          {mode === 'choice' && !emailSent && (
            <div className="space-y-3">
              <button
                onClick={() => switchMode('email')}
                className="block w-full text-center py-3.5 rounded-xl font-dm-sans font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: '#1B5E3B' }}
              >
                Restablecer con email →
              </button>
              <button
                onClick={() => switchMode('code')}
                className="block w-full text-center py-3.5 rounded-xl font-dm-sans font-semibold text-sm text-brand-green border-2 border-brand-green hover:bg-brand-green/5 transition"
              >
                Restablecer con código de acceso →
              </button>
            </div>
          )}

          {/* Email mode */}
          {mode === 'email' && !emailSent && (
            <form onSubmit={handleEmailReset} className="space-y-4">
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

          {/* Code mode */}
          {mode === 'code' && (
            <form onSubmit={handleCodeReset} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5">
                  Código de acceso
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(formatCode(e.target.value))}
                  required
                  maxLength={11}
                  placeholder="ABC-123-XYZ"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink font-mono text-base font-semibold tracking-widest text-center bg-gray-50 text-gray-900 placeholder-gray-300 uppercase transition"
                />
                <p className="font-dm-sans text-xs text-gray-400 mt-1.5 text-center">Formato: ABC-123-XYZ</p>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5">
                  Nueva contraseña
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Al menos 8 caracteres"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink font-dm-sans text-sm bg-gray-50 text-gray-900 placeholder-gray-400 transition"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5">
                  Confirma tu contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repite tu contraseña"
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
                disabled={loading || code.length < 11}
                className="w-full py-3.5 rounded-xl font-dm-sans font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] mt-2"
                style={{ backgroundColor: '#1B5E3B' }}
              >
                {loading ? 'Restableciendo...' : 'Restablecer contraseña →'}
              </button>
            </form>
          )}

          {emailSent && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center">
              <p className="text-sm font-dm-sans text-emerald-700">
                Te enviamos un email para restablecer tu contraseña.
              </p>
            </div>
          )}

          {mode !== 'choice' && !emailSent && (
            <button
              type="button"
              onClick={() => switchMode('choice')}
              className="block w-full text-center mt-4 py-2 font-dm-sans text-xs text-gray-400 hover:text-brand-green transition"
            >
              ← Otras opciones
            </button>
          )}

          <Link
            href="/login"
            className="block w-full text-center mt-2 py-2 font-dm-sans text-sm text-gray-500 hover:text-brand-green transition"
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
