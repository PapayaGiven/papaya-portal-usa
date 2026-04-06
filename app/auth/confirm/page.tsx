'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

function ConfirmForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    async function handleToken() {
      const supabase = createClient()

      // Log all URL info for debugging
      const allParams: Record<string, string> = {}
      searchParams.forEach((value, key) => { allParams[key] = value })
      const hashStr = typeof window !== 'undefined' ? window.location.hash : ''
      const fullUrl = typeof window !== 'undefined' ? window.location.href : ''

      console.log('[auth/confirm] Full URL:', fullUrl)
      console.log('[auth/confirm] Search params:', allParams)
      console.log('[auth/confirm] Hash:', hashStr)

      setDebugInfo(JSON.stringify({ params: allParams, hash: hashStr }, null, 2))

      const tokenHash = searchParams.get('token_hash')
      const token = searchParams.get('token')
      const type = searchParams.get('type') as 'invite' | 'email' | null

      // Format 1: ?token_hash=xxx&type=invite  (current Supabase invite format)
      if (tokenHash && (type === 'invite' || type === 'email')) {
        console.log('[auth/confirm] Using verifyOtp with token_hash')
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type,
        })
        if (error) {
          console.error('[auth/confirm] verifyOtp error:', error)
          setError(`Enlace de invitación no válido: ${error.message}`)
        } else {
          console.log('[auth/confirm] verifyOtp success')
          setSessionReady(true)
        }
        setExchanging(false)
        return
      }

      // Format 2: ?token=xxx&type=invite  (older Supabase format)
      if (token && (type === 'invite' || type === 'email')) {
        console.log('[auth/confirm] Using verifyOtp with token (older format)')
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type,
        })
        if (error) {
          console.error('[auth/confirm] verifyOtp (token) error:', error)
          setError(`Enlace de invitación no válido: ${error.message}`)
        } else {
          console.log('[auth/confirm] verifyOtp (token) success')
          setSessionReady(true)
        }
        setExchanging(false)
        return
      }

      // Format 3: #access_token=xxx&refresh_token=yyy  (hash/fragment format)
      if (hashStr) {
        const hashParams = new URLSearchParams(hashStr.replace('#', ''))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        console.log('[auth/confirm] Hash params:', { accessToken: !!accessToken, refreshToken: !!refreshToken })

        if (accessToken && refreshToken) {
          console.log('[auth/confirm] Setting session from hash tokens')
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            console.error('[auth/confirm] setSession error:', error)
            setError(`No se pudo establecer la sesión: ${error.message}`)
          } else {
            console.log('[auth/confirm] setSession success')
            setSessionReady(true)
          }
          setExchanging(false)
          return
        }
      }

      // Format 4: ?code=xxx  (PKCE code exchange)
      const code = searchParams.get('code')
      if (code) {
        console.log('[auth/confirm] Using exchangeCodeForSession with code')
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('[auth/confirm] exchangeCodeForSession error:', error)
          setError(`Error en el intercambio de código: ${error.message}`)
        } else {
          console.log('[auth/confirm] exchangeCodeForSession success')
          setSessionReady(true)
        }
        setExchanging(false)
        return
      }

      // No token found — check if there's already an active session
      console.log('[auth/confirm] No token found, checking existing session')
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('[auth/confirm] Existing session found')
        setSessionReady(true)
      } else {
        console.warn('[auth/confirm] No token and no session — link may be invalid')
        setError('No se encontró un enlace de invitación válido. Por favor solicita una nueva invitación.')
      }
      setExchanging(false)
    }

    handleToken()
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      console.error('[auth/confirm] updateUser error:', updateError)
      setError(`Error: ${updateError.message}`)
      setLoading(false)
      return
    }

    console.log('[auth/confirm] Password set successfully, redirecting')
    router.push('/dashboard')
    router.refresh()
  }

  if (exchanging) {
    return (
      <div className="min-h-screen bg-brand-light-pink flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-dm-sans text-sm text-gray-500">Confirmando invitación…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-light-pink flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-sm border border-brand-pink/20 p-10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image
                src="https://cgimvsmnfmpzpkakiguo.supabase.co/storage/v1/object/public/PSC%20LOGOS/logo_pink.png"
                alt="Papaya Social Club"
                width={80}
                height={80}
              />
            </div>
            <p className="font-dm-sans text-xs uppercase tracking-[0.25em] text-gray-400 mb-3">
              Papaya Social Club
            </p>
            <h1 className="font-playfair text-4xl text-brand-green leading-tight">
              {sessionReady ? '¡Bienvenida!' : 'Error'}
            </h1>
            {sessionReady && (
              <p className="font-dm-sans text-gray-500 mt-2 text-sm">
                Crea tu contraseña para comenzar.
              </p>
            )}
          </div>

          {/* Show error state (no session) */}
          {!sessionReady && error && (
            <div className="space-y-4">
              <div className="bg-brand-pink/10 border border-brand-pink/30 rounded-xl px-4 py-3">
                <p className="text-sm font-dm-sans text-rose-600">{error}</p>
              </div>
              {process.env.NODE_ENV !== 'production' && debugInfo && (
                <details className="text-left">
                  <summary className="font-dm-sans text-xs text-gray-400 cursor-pointer">Debug info</summary>
                  <pre className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mt-2 overflow-auto">{debugInfo}</pre>
                </details>
              )}
              <p className="text-center font-dm-sans text-xs text-gray-400">
                Por favor contacta a tu agencia para una nueva invitación.
              </p>
            </div>
          )}

          {/* Password form (session ready) */}
          {sessionReady && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5"
                >
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink font-dm-sans text-sm bg-gray-50 text-gray-900 placeholder-gray-400 transition"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5"
                >
                  Confirmar contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repetir contraseña"
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
                {loading ? 'Guardando...' : 'Establecer contraseña →'}
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

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmForm />
    </Suspense>
  )
}
