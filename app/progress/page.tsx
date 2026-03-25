import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Nav from '@/components/Nav'
import { Creator, CreatorLevel, LEVEL_CONFIG } from '@/lib/types'

const LEVEL_PERKS: Record<CreatorLevel, { title: string; gmvRange: string; perks: string[]; color: string; emoji: string }> = {
  Initiation: {
    title: 'Initiation',
    gmvRange: '€0 – €299',
    emoji: '🌱',
    color: '#9CA3AF',
    perks: [
      'Zugang zur Creator-Community',
      'Basis-Produktkatalog',
      'Wöchentliche Tipps & Tricks',
      'Creator-Newsletter',
      'Dashboard-Zugang',
    ],
  },
  Rising: {
    title: 'Rising',
    gmvRange: '€300 – €999',
    emoji: '🌸',
    color: '#F4A7C3',
    perks: [
      'Alles aus Initiation',
      'Exklusive Produkte freigeschalten',
      'Priority-Support',
      'Brand-Deal Alerts (Erstbenachrichtigung)',
      '€300 GMV Badge',
      'Monatliches Creator-Briefing',
    ],
  },
  Pro: {
    title: 'Pro',
    gmvRange: '€1.000 – €4.999',
    emoji: '💚',
    color: '#1B5E3B',
    perks: [
      'Alles aus Rising',
      'Premium-Kampagnen (Pro+ exklusiv)',
      'Dedicated Creator Manager',
      '1:1 Strategie-Calls (monatlich)',
      '€1.000 GMV Badge',
      'Vierteljährlicher Bonus',
    ],
  },
  Elite: {
    title: 'Elite',
    gmvRange: '€5.000+',
    emoji: '👑',
    color: '#F59E0B',
    perks: [
      'Alles aus Pro',
      'Alle Kampagnen & höchste Provisionen',
      'Early Access auf neue Produkte',
      'Co-Branded Deals & Agency-Partnerschaft',
      '€5.000 GMV Badge',
      'Event-Einladungen & Reisen',
    ],
  },
}

const LEVELS: CreatorLevel[] = ['Initiation', 'Rising', 'Pro', 'Elite']

function getLevelIndex(level: CreatorLevel): number {
  return LEVELS.indexOf(level)
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creatorData } = await supabase
    .from('creators')
    .select('*')
    .eq('email', user.email!)
    .single()

  const creator = creatorData as Creator | null
  const currentLevelIndex = creator ? getLevelIndex(creator.level) : 0

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-playfair text-4xl text-brand-black mb-2">Dein Weg nach oben.</h1>
          <p className="font-dm-sans text-gray-500 text-sm">
            Vier Level, eine Mission. Sieh, wo du stehst und was als Nächstes kommt.
          </p>
        </div>

        {/* Current status pill */}
        {creator && (
          <div className="mb-8 inline-flex items-center gap-3 bg-white border border-gray-100 rounded-full px-5 py-2.5 shadow-sm">
            <span className="text-xl">{LEVEL_PERKS[creator.level].emoji}</span>
            <span className="font-dm-sans text-sm font-semibold text-brand-black">
              Du bist auf Level
            </span>
            <span
              className="font-dm-sans text-sm font-bold px-3 py-0.5 rounded-full text-white"
              style={{ backgroundColor: LEVEL_PERKS[creator.level].color }}
            >
              {creator.level}
            </span>
            <span className="font-dm-sans text-sm text-gray-400">
              · GMV: €{creator.gmv.toLocaleString('de-DE')}
            </span>
          </div>
        )}

        {/* Level cards */}
        <div className="flex flex-col gap-4">
          {LEVELS.map((level, idx) => {
            const config = LEVEL_PERKS[level]
            const isCurrent = creator?.level === level
            const isPast = idx < currentLevelIndex
            const isFuture = idx > currentLevelIndex

            return (
              <div
                key={level}
                className={`relative bg-white rounded-2xl border transition-all overflow-hidden ${
                  isCurrent
                    ? 'border-brand-pink shadow-md'
                    : isPast
                    ? 'border-gray-100'
                    : 'border-gray-100 opacity-50'
                }`}
              >
                {/* Left accent bar */}
                {isCurrent && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                    style={{ backgroundColor: config.color }}
                  />
                )}
                {isPast && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gray-200" />
                )}

                <div className="p-6 pl-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-playfair text-2xl text-brand-black leading-none">
                            {config.title}
                          </h2>
                          {isCurrent && (
                            <span
                              className="font-dm-sans text-xs font-bold px-2.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: config.color }}
                            >
                              Aktuell
                            </span>
                          )}
                          {isPast && (
                            <span className="font-dm-sans text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              ✓ Erreicht
                            </span>
                          )}
                          {isFuture && (
                            <span className="font-dm-sans text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                              🔒 Gesperrt
                            </span>
                          )}
                        </div>
                        <p className="font-dm-sans text-sm text-gray-400 mt-0.5">{config.gmvRange}</p>
                      </div>
                    </div>
                  </div>

                  {/* Perks */}
                  <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                    {config.perks.map((perk, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 shrink-0 text-sm ${
                            isFuture ? 'text-gray-300' : 'text-emerald-500'
                          }`}
                        >
                          {isFuture ? '○' : '✓'}
                        </span>
                        <span
                          className={`font-dm-sans text-sm ${
                            isFuture ? 'text-gray-400' : 'text-gray-700'
                          }`}
                        >
                          {perk}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Progress bar for current level */}
                  {isCurrent && creator && LEVEL_CONFIG[level].target && (
                    <div className="mt-5 pt-4 border-t border-gray-50">
                      <div className="flex justify-between mb-1.5">
                        <span className="font-dm-sans text-xs text-gray-400">
                          €{creator.gmv.toLocaleString('de-DE')} GMV
                        </span>
                        <span className="font-dm-sans text-xs text-gray-400">
                          Ziel: €{(LEVEL_CONFIG[level].target ?? 0).toLocaleString('de-DE')}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min((creator.gmv / (LEVEL_CONFIG[level].target ?? 1)) * 100, 100)}%`,
                            backgroundColor: config.color,
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
