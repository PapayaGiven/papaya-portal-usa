import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Nav from '@/components/Nav'
import LockedSection from '@/components/LockedSection'
import { Creator } from '@/lib/types'
import { canSeeLeaderboard } from '@/lib/levelAccess'
import { LEVEL_CONFIG } from '@/lib/types'

type LeaderboardEntry = Pick<Creator, 'id' | 'name' | 'email' | 'gmv' | 'level'>

const RANK_STYLES: Record<number, { badge: string; label: string }> = {
  1: { badge: 'bg-amber-400 text-white', label: '🥇' },
  2: { badge: 'bg-gray-300 text-white', label: '🥈' },
  3: { badge: 'bg-amber-600 text-white', label: '🥉' },
}

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creatorData } = await supabase
    .from('creators')
    .select('id, name, email, gmv, level')
    .eq('email', user.email!)
    .single()

  const creator = creatorData as LeaderboardEntry | null
  const level = creator?.level ?? 'Initiation'
  const unlocked = canSeeLeaderboard(level)

  // Fetch leaderboard using admin client (bypasses RLS)
  const admin = createAdminClient()
  const { data: topCreators } = await admin
    .from('creators')
    .select('id, name, email, gmv, level')
    .eq('is_active', true)
    .order('gmv', { ascending: false })
    .limit(20)

  const leaderboard = (topCreators ?? []) as LeaderboardEntry[]
  const previewLeaderboard = leaderboard.slice(0, 5)
  const myRank = creator
    ? leaderboard.findIndex((c) => c.id === creator.id) + 1
    : null

  function displayName(c: LeaderboardEntry) {
    return c.name || c.email.split('@')[0]
  }

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav level={creator?.level ?? null} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex items-center gap-4">
          <Image
            src="https://cgimvsmnfmpzpkakiguo.supabase.co/storage/v1/object/public/PSC%20LOGOS/logo_pink.png"
            alt="Papaya Social Club"
            width={48}
            height={48}
          />
          <div>
            <h1 className="font-playfair text-4xl text-brand-black mb-1">Ranking</h1>
            <p className="font-dm-sans text-gray-500 text-sm">
              {unlocked ? `Top ${leaderboard.length} creadoras por GMV` : 'Se desbloquea en el nivel Rising'}
            </p>
          </div>
        </div>

        {/* Your rank card */}
        {unlocked && creator && myRank && (
          <div className="bg-white rounded-2xl border border-brand-pink/20 shadow-sm p-5 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-light-pink flex items-center justify-center font-playfair text-xl text-brand-pink font-bold">
                {myRank}
              </div>
              <div>
                <p className="font-dm-sans font-semibold text-sm text-brand-black">Tu posición</p>
                <p className="font-dm-sans text-xs text-gray-400">#{myRank} out of {leaderboard.length}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-playfair text-2xl font-bold text-brand-green">
                ${creator.gmv.toLocaleString('en-US')}
              </p>
              <p className="font-dm-sans text-xs text-gray-400">Tu GMV</p>
            </div>
          </div>
        )}

        {unlocked ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {leaderboard.map((c, idx) => {
              const rank = idx + 1
              const isMe = c.id === creator?.id
              const levelColor = LEVEL_CONFIG[c.level]?.color ?? '#9CA3AF'
              const rankStyle = RANK_STYLES[rank]

              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 transition-colors ${
                    isMe ? 'bg-brand-light-pink/50' : 'hover:bg-gray-50/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    rankStyle ? rankStyle.badge : 'bg-gray-100 text-gray-500'
                  }`}>
                    {rankStyle ? rankStyle.label : rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-dm-sans font-semibold text-sm truncate ${isMe ? 'text-brand-green' : 'text-brand-black'}`}>
                        {displayName(c)}
                        {isMe && <span className="ml-1 font-dm-sans text-xs font-normal text-brand-green">(tú)</span>}
                      </p>
                      <span
                        className="font-dm-sans text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: levelColor }}
                      >
                        {c.level}
                      </span>
                    </div>
                  </div>
                  <p className="font-playfair text-lg font-bold text-brand-green shrink-0">
                    ${c.gmv.toLocaleString('en-US')}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <LockedSection unlockAt="Rising">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {previewLeaderboard.map((c, idx) => (
                <div key={c.id} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-dm-sans font-semibold text-sm text-brand-black">{displayName(c)}</p>
                  </div>
                  <p className="font-playfair text-lg font-bold text-brand-green">
                    ${c.gmv.toLocaleString('en-US')}
                  </p>
                </div>
              ))}
            </div>
          </LockedSection>
        )}
      </main>
    </div>
  )
}
