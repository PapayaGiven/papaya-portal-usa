import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Nav from '@/components/Nav'
import { Creator, CreatorLevel } from '@/lib/types'

interface Reward {
  emoji: string
  title: string
  description: string
}

const REWARDS: Record<CreatorLevel, { color: string; gmvRange: string; emoji: string; rewards: Reward[] }> = {
  Initiation: {
    color: '#9CA3AF',
    gmvRange: '€0 – €299',
    emoji: '🌱',
    rewards: [
      { emoji: '📦', title: 'Willkommenspaket', description: 'Dein Papaya-Starterkit mit allem, was du brauchst.' },
      { emoji: '💬', title: 'Community Discord', description: 'Zugang zur exklusiven Creator-Community.' },
      { emoji: '📊', title: 'Creator Dashboard', description: 'Dein persönliches Dashboard zur Fortschritts-Analyse.' },
      { emoji: '📩', title: 'Wöchentlicher Newsletter', description: 'Tipps, Trends und neue Produktinfos direkt ins Postfach.' },
    ],
  },
  Rising: {
    color: '#F4A7C3',
    gmvRange: '€300 – €999',
    emoji: '🌸',
    rewards: [
      { emoji: '🎁', title: 'Papaya Creator Kit', description: 'Exklusives Brand-Kit: Aufkleber, Notizbuch, Tote Bag.' },
      { emoji: '💰', title: 'Monatlicher €25 Bonus', description: '€25 extra auf deinen Auszahlungen jeden Monat.' },
      { emoji: '📢', title: 'Brand-Deal Erstbenachrichtigung', description: 'Du erfährst als Erste von neuen Kampagnen.' },
      { emoji: '🏅', title: '€300 GMV Badge', description: 'Offizielles Rising-Badge für dein Profil.' },
    ],
  },
  Pro: {
    color: '#1B5E3B',
    gmvRange: '€1.000 – €4.999',
    emoji: '💚',
    rewards: [
      { emoji: '💸', title: 'Vierteljährlicher €100 Bonus', description: '€100 Bonus alle drei Monate on top.' },
      { emoji: '📸', title: 'Foto & Video Shooting', description: 'Professionelles Content-Shooting mit Papaya-Team.' },
      { emoji: '🌐', title: 'Agency Portfolio Feature', description: 'Du wirst auf der Papaya-Website als Creator vorgestellt.' },
      { emoji: '📞', title: '1:1 Strategie-Calls', description: 'Monatliche Strategy-Session mit deinem Dedicated Manager.' },
    ],
  },
  Elite: {
    color: '#F59E0B',
    gmvRange: '€5.000+',
    emoji: '👑',
    rewards: [
      { emoji: '💎', title: 'Vierteljährlicher €500 Bonus', description: '€500 extra alle drei Monate als Top-Creator.' },
      { emoji: '🤝', title: 'Agency-Partnerschaft', description: 'Offizieller Papaya-Partnervertrag mit exklusiven Konditionen.' },
      { emoji: '✈️', title: 'Event-Einladungen & Reisen', description: 'Einladungen zu Brand-Events, Messen und Creator-Retreats.' },
      { emoji: '🔧', title: 'Co-Branded Deals', description: 'Kampagnen, die speziell um dich als Creator gebaut werden.' },
    ],
  },
}

const LEVELS: CreatorLevel[] = ['Initiation', 'Rising', 'Pro', 'Elite']

export default async function RewardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creatorData } = await supabase
    .from('creators')
    .select('level, gmv')
    .eq('email', user.email!)
    .single()

  const creator = creatorData as Pick<Creator, 'level' | 'gmv'> | null
  const currentLevelIndex = creator ? LEVELS.indexOf(creator.level) : 0

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-playfair text-4xl text-brand-black mb-2">Deine Rewards.</h1>
          <p className="font-dm-sans text-gray-500 text-sm">
            Was du jetzt verdienst — und worauf du dich freuen kannst.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {LEVELS.map((level, idx) => {
            const config = REWARDS[level]
            const isCurrent = creator?.level === level
            const isPast = idx < currentLevelIndex
            const isFuture = idx > currentLevelIndex

            return (
              <div
                key={level}
                className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                  isCurrent
                    ? 'border-brand-pink shadow-md'
                    : isPast
                    ? 'border-gray-100'
                    : 'border-gray-100 opacity-45'
                }`}
              >
                {/* Header */}
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{
                    backgroundColor: isFuture ? '#F9FAFB' : `${config.color}15`,
                    borderBottom: `1px solid ${isFuture ? '#F3F4F6' : `${config.color}30`}`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{config.emoji}</span>
                    <div>
                      <h2 className="font-playfair text-xl text-brand-black leading-none">
                        {level}
                      </h2>
                      <p className="font-dm-sans text-xs text-gray-400 mt-0.5">{config.gmvRange}</p>
                    </div>
                  </div>
                  <div>
                    {isCurrent && (
                      <span
                        className="font-dm-sans text-xs font-bold px-2.5 py-1 rounded-full text-white"
                        style={{ backgroundColor: config.color }}
                      >
                        Aktuell
                      </span>
                    )}
                    {isPast && (
                      <span className="font-dm-sans text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                        ✓ Freigeschaltet
                      </span>
                    )}
                    {isFuture && (
                      <span className="font-dm-sans text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                        🔒 Gesperrt
                      </span>
                    )}
                  </div>
                </div>

                {/* Rewards list */}
                <div className="p-5 space-y-3">
                  {config.rewards.map((reward, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-xl ${
                        isFuture ? 'bg-gray-50/50' : 'bg-gray-50'
                      }`}
                    >
                      <span className={`text-xl shrink-0 ${isFuture ? 'grayscale opacity-40' : ''}`}>
                        {reward.emoji}
                      </span>
                      <div>
                        <p
                          className={`font-dm-sans text-sm font-semibold ${
                            isFuture ? 'text-gray-400' : 'text-brand-black'
                          }`}
                        >
                          {reward.title}
                        </p>
                        <p
                          className={`font-dm-sans text-xs mt-0.5 ${
                            isFuture ? 'text-gray-300' : 'text-gray-500'
                          }`}
                        >
                          {reward.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
