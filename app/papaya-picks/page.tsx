import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Nav from '@/components/Nav'
import { CreatorLevel, PapayaPick } from '@/lib/types'
import { canSeePapayaPicks } from '@/lib/levelAccess'
import PapayaPicksGrid from '@/components/PapayaPicksGrid'

export const dynamic = 'force-dynamic'

export default async function PapayaPicksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const authEmail = (user.email ?? '').trim().toLowerCase()
  const { data: creator } = await supabase
    .from('creators')
    .select('id, name, level')
    .ilike('email', authEmail)
    .maybeSingle()

  const level = (creator?.level ?? 'Initiation') as CreatorLevel

  if (!canSeePapayaPicks(level)) {
    return (
      <div className="min-h-screen bg-brand-light-pink">
        <Nav level={level} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-3xl border border-brand-pink/20 p-12 text-center">
            <p className="text-5xl mb-4">🔒</p>
            <h1 className="font-playfair text-3xl text-brand-black mb-3">Papaya Picks se desbloquea en Foundation</h1>
            <p className="font-dm-sans text-gray-500">Enfócate en tus 3 productos este mes para llegar al siguiente nivel.</p>
          </div>
        </main>
      </div>
    )
  }

  // Fetch active picks via admin client (RLS-safe but explicit)
  const admin = createAdminClient()
  const { data: picksData } = await admin
    .from('papaya_picks')
    .select('*')
    .eq('is_active', true)
    .order('papaya_pick_score', { ascending: false })

  const picks = ((picksData ?? []) as PapayaPick[]).filter((p) => {
    if (!p.expires_at) return true
    return new Date(p.expires_at) > new Date()
  })

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav level={level} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-playfair text-4xl text-brand-black mb-2">🌟 Papaya Picks</h1>
          <p className="font-dm-sans text-gray-500">Productos con alta demanda y poca competencia — sé la primera.</p>
        </div>
        <PapayaPicksGrid picks={picks} />
      </main>
    </div>
  )
}
