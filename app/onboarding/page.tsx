'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { verifyAccessCode, completeOnboarding } from '@/app/admin/actions'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [code, setCode] = useState('')
  const [creator, setCreator] = useState<{ name: string; email: string } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)
  const [loading, setLoading] = useState(false)

  function formatCode(value: string): string {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const parts: string[] = []
    if (cleaned.length > 0) parts.push(cleaned.slice(0, 3))
    if (cleaned.length > 3) parts.push(cleaned.slice(3, 6))
    if (cleaned.length > 6) parts.push(cleaned.slice(6, 9))
    return parts.join('-')
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setAlreadyCompleted(false)

    const result = await verifyAccessCode(code)
    setLoading(false)

    if (result.error === 'invalid') {
      setError('Código no válido. Contacta a tu account manager.')
      return
    }
    if (result.error === 'already_completed') {
      setAlreadyCompleted(true)
      return
    }
    if (result.error) {
      setError(result.error)
      return
    }

    setCreator({ name: result.name ?? '', email: result.email ?? '' })
    setEmail(result.email ?? '')
    setStep(2)
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const result = await completeOnboarding({ access_code: code, email, password })
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr) {
      setError(`Cuenta creada, pero el inicio de sesión falló: ${signInErr.message}`)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
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

            {step === 1 ? (
              <>
                <h1 className="font-playfair text-3xl text-brand-green leading-tight">Bienvenida 🌸</h1>
                <p className="font-dm-sans text-gray-500 mt-2 text-sm">
                  Ingresa tu código de acceso para empezar.
                </p>
              </>
            ) : (
              <>
                <h1 className="font-playfair text-3xl text-brand-green leading-tight">Bienvenida a Papaya Social Club 🌸</h1>
                {creator?.name && (
                  <p className="font-dm-sans text-base font-semibold text-brand-black mt-2">
                    ¡Hola, {creator.name}!
                  </p>
                )}
                <p className="font-dm-sans text-gray-500 mt-1 text-sm">
                  Configura tu cuenta para comenzar.
                </p>
              </>
            )}
          </div>

          {step === 1 && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5">
                  Ingresa tu código de acceso
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
                <p className="font-dm-sans text-xs text-gray-400 mt-1.5 text-center">
                  Formato: ABC-123-XYZ
                </p>
              </div>

              {error && (
                <div className="bg-brand-pink/10 border border-brand-pink/30 rounded-xl px-4 py-3">
                  <p className="text-sm font-dm-sans text-rose-600">{error}</p>
                </div>
              )}

              {alreadyCompleted && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
                  <p className="text-sm font-dm-sans text-amber-800 font-medium">
                    Ya tienes una cuenta. Inicia sesión con tu email y contraseña.
                  </p>
                  <p className="text-sm font-dm-sans text-amber-800">
                    ¿Olvidaste tu contraseña?{' '}
                    <Link href="/forgot-password" className="font-semibold text-brand-green underline hover:no-underline">
                      Restablecer aquí →
                    </Link>
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length < 11 || alreadyCompleted}
                className="w-full py-3.5 rounded-xl font-dm-sans font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] mt-2"
                style={{ backgroundColor: '#1B5E3B' }}
              >
                {loading ? 'Verificando...' : 'Continuar →'}
              </button>

              <Link
                href="/login"
                className="block w-full text-center py-2 font-dm-sans text-xs text-gray-400 hover:text-brand-green transition"
              >
                ← Volver al inicio de sesión
              </Link>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5">
                  Tu email
                </label>
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

              <div>
                <label htmlFor="password" className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5">
                  Crea tu contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-dm-sans font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] mt-2"
                style={{ backgroundColor: '#1B5E3B' }}
              >
                {loading ? 'Creando...' : 'Crear mi cuenta →'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 font-dm-sans mt-6">
          © 2024 Papaya Social Club · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
