import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Nav from '@/components/Nav'
import RewardCTA from '@/components/RewardCTA'
import { Creator } from '@/lib/types'
import { LEVEL_ORDER, getLevelIndex } from '@/lib/levelAccess'

const LEVEL_STYLE: Record<string, { emoji: string; color: string }> = {
  Initiation: { emoji: '🌱', color: '#9CA3AF' },
  Foundation: { emoji: '🌸', color: '#F4A7C3' },
  Growth: { emoji: '💚', color: '#1B5E3B' },
  Scale: { emoji: '🚀', color: '#8B5CF6' },
  Elite: { emoji: '👑', color: '#F59E0B' },
}

interface Level {
  id: string
  name: string
  order_index: number
  gmv_min: number
  gmv_max: number | null
  emoji?: string | null
  color?: string | null
  description: string | null
  includes: string[]
  excludes: string[]
}

interface Reward {
  id: string
  level_name: string
  order_index: number
  emoji: string
  title: string
  description: string | null
  cta_type: 'link' | 'none' | 'whatsapp' | string
  cta_text: string | null
  cta_url: string | null
  requires_address: boolean
}

interface CreatorReward {
  id: string
  creator_id: string
  reward_id: string
  claimed_at: string
}

export default async function MiProgresoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creatorData } = await supabase
    .from('creators')
    .select('*')
    .eq('email', user.email!)
    .single()

  const creator = creatorData as Creator | null
  if (!creator) redirect('/login')

  const level = creator.level
  const currentLevelIndex = getLevelIndex(level)

  const { data: levelsData } = await supabase
    .from('levels')
    .select('*')
    .order('order_index')

  const levels = (levelsData ?? []) as Level[]

  const { data: rewardsData } = await supabase
    .from('rewards')
    .select('*')
    .order('level_name')
    .order('order_index')

  const rewards = (rewardsData ?? []) as Reward[]

  const { data: creatorRewardsData } = await supabase
    .from('creator_rewards')
    .select('*')
    .eq('creator_id', creator.id)

  const creatorRewards = (creatorRewardsData ?? []) as CreatorReward[]
  const claimedRewardIds = new Set(creatorRewards.map((cr) => cr.reward_id))

  // Group rewards by level_name
  const rewardsByLevel: Record<string, Reward[]> = {}
  for (const reward of rewards) {
    if (!rewardsByLevel[reward.level_name]) {
      rewardsByLevel[reward.level_name] = []
    }
    rewardsByLevel[reward.level_name].push(reward)
  }

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav level={level} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Image
            src="https://nptkinihgouicdimytbf.supabase.co/storage/v1/object/public/PSC%20LOGOS/logo_pink.png"
            alt="Papaya Social Club"
            width={48}
            height={48}
          />
          <div>
            <h1 className="font-playfair text-4xl text-brand-black mb-1">Mi Progreso</h1>
            <p className="font-dm-sans text-gray-500 text-sm">
              Dentro de Papaya Social Club tienes espacio para crecer. Cada nivel desbloquea nuevas herramientas, oportunidades y recompensas diseñadas para llevar tu negocio al siguiente nivel.
            </p>
          </div>
        </div>

        {/* Current level badge */}
        <div className="mb-8 inline-flex items-center gap-3 bg-white border border-gray-100 rounded-full px-5 py-2.5 shadow-sm">
          <span className="text-xl">
            {levels.find((l) => l.name === creator.level)?.emoji ?? LEVEL_STYLE[creator.level]?.emoji ?? '🌱'}
          </span>
          <span className="font-dm-sans text-sm font-semibold text-brand-black">Estás en el nivel</span>
          <span
            className="font-dm-sans text-sm font-bold px-3 py-0.5 rounded-full text-white"
            style={{ backgroundColor: levels.find((l) => l.name === creator.level)?.color ?? LEVEL_STYLE[creator.level]?.color ?? '#9CA3AF' }}
          >
            {creator.level}
          </span>
          <span className="font-dm-sans text-sm text-gray-400">
            · GMV: ${creator.gmv.toLocaleString('en-US')}
          </span>
        </div>

        {/* Level cards */}
        <div className="flex flex-col gap-4">
          {levels.map((lvl) => {
            const lvlIndex = LEVEL_ORDER.indexOf(lvl.name as typeof LEVEL_ORDER[number])
            const isCurrent = creator.level === lvl.name
            const isPast = lvlIndex < currentLevelIndex && lvlIndex !== -1
            const isFuture = lvlIndex > currentLevelIndex
            const levelRewards = rewardsByLevel[lvl.name] ?? []
            const gmvMax = lvl.gmv_max

            return (
              <div
                key={lvl.id}
                className={`relative bg-white rounded-2xl border transition-all overflow-hidden ${
                  isCurrent ? 'border-brand-pink shadow-md' : isPast ? 'border-gray-100' : 'border-gray-100 opacity-50'
                }`}
              >
                {/* Left accent bar */}
                {isCurrent && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: lvl.color ?? LEVEL_STYLE[lvl.name]?.color ?? '#9CA3AF' }} />
                )}
                {isPast && <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gray-200" />}

                <div className="p-6 pl-7">
                  {/* Level header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lvl.emoji ?? LEVEL_STYLE[lvl.name]?.emoji ?? '🌱'}</span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-playfair text-2xl text-brand-black leading-none">{lvl.name}</h2>
                          {isCurrent && (
                            <span className="font-dm-sans text-xs font-bold px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: lvl.color ?? LEVEL_STYLE[lvl.name]?.color ?? '#9CA3AF' }}>
                              Actual
                            </span>
                          )}
                          {isPast && (
                            <span className="font-dm-sans text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              ✓ Alcanzado
                            </span>
                          )}
                          {isFuture && (
                            <span className="font-dm-sans text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                              🔒 Bloqueado
                            </span>
                          )}
                        </div>
                        <p className="font-dm-sans text-sm text-gray-400 mt-0.5">
                          {gmvMax
                            ? `$${lvl.gmv_min.toLocaleString('en-US')} – $${gmvMax.toLocaleString('en-US')}`
                            : `$${lvl.gmv_min.toLocaleString('en-US')}+`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {lvl.description && (
                    <p className={`font-dm-sans text-sm mt-3 ${isFuture ? 'text-gray-400' : 'text-gray-600'}`}>
                      {lvl.description}
                    </p>
                  )}

                  {/* Includes list */}
                  {lvl.includes && lvl.includes.length > 0 && (
                    <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                      {lvl.includes.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className={`mt-0.5 shrink-0 text-sm ${isFuture ? 'text-gray-300' : 'text-emerald-500'}`}>
                            {isFuture ? '○' : '✓'}
                          </span>
                          <span className={`font-dm-sans text-sm ${isFuture ? 'text-gray-400' : 'text-gray-700'}`}>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Excludes list */}
                  {lvl.excludes && lvl.excludes.length > 0 && (
                    <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                      {lvl.excludes.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0 text-sm text-gray-300">🔒</span>
                          <span className="font-dm-sans text-sm text-gray-400">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Rewards section */}
                  {levelRewards.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <h3 className={`font-dm-sans text-xs font-semibold uppercase tracking-wider mb-3 ${isFuture ? 'text-gray-300' : 'text-gray-400'}`}>
                        Recompensas
                      </h3>
                      <div className="space-y-3">
                        {levelRewards.map((reward) => {
                          const claimed = claimedRewardIds.has(reward.id)
                          const isLocked = isFuture

                          return (
                            <div
                              key={reward.id}
                              className={`flex items-start gap-3 p-3 rounded-xl ${isFuture ? 'bg-gray-50/50' : 'bg-gray-50'}`}
                            >
                              <span className={`text-xl shrink-0 ${isFuture ? 'grayscale opacity-40' : ''}`}>{reward.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`font-dm-sans text-sm font-semibold ${isFuture ? 'text-gray-400' : 'text-brand-black'}`}>
                                  {reward.title}
                                </p>
                                {reward.description && (
                                  <p className={`font-dm-sans text-xs mt-0.5 ${isFuture ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {reward.description}
                                  </p>
                                )}
                                <div className="mt-2">
                                  <RewardCTA
                                    rewardId={reward.id}
                                    ctaType={reward.cta_type}
                                    ctaText={reward.cta_text}
                                    ctaUrl={reward.cta_url}
                                    requiresAddress={reward.requires_address}
                                    isClaimed={claimed}
                                    isLocked={isLocked}
                                    accountManagerWhatsapp={creator.account_manager_whatsapp}
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Progress bar on current level */}
                  {isCurrent && gmvMax && (
                    <div className="mt-5 pt-4 border-t border-gray-50">
                      <div className="flex justify-between mb-1.5">
                        <span className="font-dm-sans text-xs text-gray-400">${creator.gmv.toLocaleString('en-US')} GMV</span>
                        <span className="font-dm-sans text-xs text-gray-400">Meta: ${gmvMax.toLocaleString('en-US')}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min((creator.gmv / gmvMax) * 100, 100)}%`,
                            backgroundColor: lvl.color ?? LEVEL_STYLE[lvl.name]?.color ?? '#9CA3AF',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
