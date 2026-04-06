'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
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
  const resolved = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    // ── Step 1: Log everything ──────────────────────────────────
    const fullUrl = window.location.href
    const hashStr = window.location.hash
    const allParams: Record<string, string> = {}
    searchParams.forEach((v, k) => { allParams[k] = v })

    console.log('[auth/confirm] ===== PAGE LOAD =====')
    console.log('[auth/confirm] Full URL:', fullUrl)
    console.log('[auth/confirm] Search params:', JSON.stringify(allParams))
    console.log('[auth/confirm] Hash fragment:', hashStr)
    console.log('[auth/confirm] Hash length:', hashStr.length)

    setDebugInfo(JSON.stringify({ url: fullUrl, params: allParams, hash: hashStr }, null, 2))

    function done(ready: boolean, err?: string) {
      if (resolved.current) return
      resolved.current = true
      console.log('[auth/confirm] ===== RESOLVED =====', ready ? 'SESSION READY' : 'FAILED', err || '')
      if (err) setError(err)
      setSessionReady(ready)
      setExchanging(false)
    }

    // ── Listen for auth state changes ────────────────────────────
    // This catches hash fragment auto-processing by supabase-js
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[auth/confirm] onAuthStateChange:', event, 'hasSession:', !!session, 'user:', session?.user?.email)
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        console.log('[auth/confirm] Session established via auth event:', event)
        done(true)
      }
    })

    // ── Step 2: Exchange token for session ───────────────────────
    async function handleToken() {
      const tokenHash = searchParams.get('token_hash')
      const token = searchParams.get('token')
      const type = searchParams.get('type')
      const code = searchParams.get('code')

      console.log('[auth/confirm] Parsed params — token_hash:', !!tokenHash, 'token:', !!token, 'type:', type, 'code:', !!code)

      // Format 1: ?token_hash=xxx&type=invite (current Supabase format)
      if (tokenHash && (type === 'invite' || type === 'email')) {
        console.log('[auth/confirm] Step 2: verifyOtp with token_hash, type:', type)
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'invite',
        })
        console.log('[auth/confirm] verifyOtp result — session:', !!data?.session, 'user:', data?.user?.email, 'error:', error?.message)
        if (error) {
          done(false, `Enlace de invitación no válido: ${error.message}`)
        }
        // Success is caught by onAuthStateChange
        return
      }

      // Format 2: ?token=xxx&type=invite (older Supabase format)
      if (token && (type === 'invite' || type === 'email')) {
        console.log('[auth/confirm] Step 2: verifyOtp with token (legacy), type:', type)
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as 'invite',
        })
        console.log('[auth/confirm] verifyOtp (legacy) result — session:', !!data?.session, 'user:', data?.user?.email, 'error:', error?.message)
        if (error) {
          done(false, `Enlace de invitación no válido: ${error.message}`)
        }
        return
      }

      // Format 3: #access_token=xxx&refresh_token=yyy (hash/implicit flow)
      // supabase-js auto-processes this — onAuthStateChange will fire
      if (hashStr && hashStr.includes('access_token')) {
        console.log('[auth/confirm] Hash contains access_token — waiting for supabase-js auto-processing...')

        // Fallback: if auto-processing doesn't fire within 5s, try manual setSession
        setTimeout(async () => {
          if (resolved.current) return
          console.warn('[auth/confirm] Auto-processing timed out after 5s, trying manual setSession')
          const hashParams = new URLSearchParams(hashStr.replace('#', ''))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          console.log('[auth/confirm] Manual hash parse — accessToken:', !!accessToken, 'refreshToken:', !!refreshToken)

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            console.log('[auth/confirm] Manual setSession result — session:', !!data?.session, 'error:', error?.message)
            if (error) {
              done(false, `No se pudo establecer la sesión: ${error.message}`)
            }
            // Success caught by onAuthStateChange
          } else {
            done(false, 'Enlace de invitación incompleto. Por favor solicita una nueva invitación.')
          }
        }, 5000)
        return
      }

      // Format 4: ?code=xxx (PKCE code exchange)
      if (code) {
        console.log('[auth/confirm] Step 2: exchangeCodeForSession with code')
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        console.log('[auth/confirm] exchangeCodeForSession result — session:', !!data?.session, 'error:', error?.message)
        if (error) {
          done(false, `Error en el intercambio de código: ${error.message}`)
        }
        return
      }

      // No token found — check if there's already a session
      console.log('[auth/confirm] No token found, checking existing session...')
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[auth/confirm] Existing session check:', !!session, 'user:', session?.user?.email)
      if (session) {
        done(true)
      } else {
        done(false, 'No se encontró un enlace de invitación válido. Por favor solicita una nueva invitación.')
      }
    }

    // Small delay to let onAuthStateChange fire first for hash tokens
    const startTimer = setTimeout(() => {
      if (!resolved.current) {
        handleToken()
      }
    }, 300)

    // Global timeout fallback
    const timeout = setTimeout(() => {
      if (!resolved.current) {
        console.error('[auth/confirm] Global timeout reached (20s)')
        done(false, 'La confirmación tardó demasiado. Por favor intenta de nuevo o solicita una nueva invitación.')
      }
    }, 20000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(startTimer)
      clearTimeout(timeout)
    }
  }, [searchParams])

  // ── Step 3: Set password ──────────────────────────────────────
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

    // Verify we still have a session before updating
    const { data: { session } } = await supabase.auth.getSession()
    console.log('[auth/confirm] Step 3: Pre-update session check:', !!session, 'user:', session?.user?.email)

    if (!session) {
      console.error('[auth/confirm] No session when trying to set password')
      setError('Sesión expirada. Por favor solicita una nueva invitación.')
      setLoading(false)
      return
    }

    console.log('[auth/confirm] Step 3: Calling updateUser to set password')
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      console.error('[auth/confirm] updateUser error:', updateError)
      setError(`Error: ${updateError.message}`)
      setLoading(false)
      return
    }

    // ── Step 4: Redirect to dashboard ─────────────────────────────
    console.log('[auth/confirm] Step 4: Password set successfully, redirecting to /dashboard')
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
                src="https://nptkinihgouicdimytbf.supabase.co/storage/v1/object/public/PSC%20LOGOS/logo_pink.png"
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

          {/* Error state */}
          {!sessionReady && error && (
            <div className="space-y-4">
              <div className="bg-brand-pink/10 border border-brand-pink/30 rounded-xl px-4 py-3">
                <p className="text-sm font-dm-sans text-rose-600">{error}</p>
              </div>
              {debugInfo && (
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

          {/* Password form */}
          {sessionReady && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5">
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
                <label htmlFor="confirmPassword" className="block text-sm font-dm-sans font-medium text-gray-700 mb-1.5">
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
