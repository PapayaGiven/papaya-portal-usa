'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Standalone sign-out so the /profile page can stay a Server Component.
 * Styled to be visually subordinate (border + muted text) so the
 * menu items above read as the primary actions.
 */
export default function SignOutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handle() {
    setBusy(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handle}
      disabled={busy}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-200 bg-white text-gray-600 font-dm-sans text-sm font-medium hover:bg-gray-50 hover:text-red-600 transition disabled:opacity-50"
    >
      <LogOut size={16} strokeWidth={1.75} />
      {busy ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
  )
}
