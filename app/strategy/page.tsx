import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Nav from '@/components/Nav'
import DailyChecklist from '@/components/DailyChecklist'
import StrategyTabs from '@/components/StrategyTabs'
import { StrategyProduct, CreatorLevel, LevelConfig } from '@/lib/types'
import { canSeeHashtags, canSeeExampleVideos } from '@/lib/levelAccess'

const PRIORITY_STYLES = {
  Hero: { badge: 'bg-amber-100 text-amber-700 border border-amber-300', dot: 'bg-amber-400' },
  Secondary: { badge: 'bg-brand-pink/20 text-brand-black border border-brand-pink/40', dot: 'bg-brand-pink' },
  Supporting: { badge: 'bg-gray-100 text-gray-600 border border-gray-200', dot: 'bg-gray-400' },
}

function VideoCard({ video }: { video: { id: string; video_url: string; thumbnail_url: string | null } }) {
  return (
    <a
      href={video.video_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl overflow-hidden border border-gray-100 hover:border-brand-pink/40 transition shadow-sm hover:shadow-md"
    >
      {video.thumbnail_url ? (
        <div className="relative aspect-[9/16] bg-gray-100 overflow-hidden">
          <img
            src={video.thumbnail_url}
            alt="Video thumbnail"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      ) : (
        <div className="aspect-[9/16] bg-gradient-to-br from-brand-light-pink to-brand-pink/20 flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-brand-pink/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-brand-green ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <p className="font-dm-sans text-xs text-gray-400">Ver en TikTok</p>
        </div>
      )}
      <div className="px-3 py-2 bg-white">
        <p className="font-dm-sans text-xs text-brand-green hover:underline truncate">TikTok →</p>
      </div>
    </a>
  )
}

export default async function StrategyPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const authEmail = (user.email ?? '').trim().toLowerCase()
  console.log('[strategy] Auth user email:', authEmail)

  const { data: creator } = await supabase
    .from('creators')
    .select('id, name, level')
    .ilike('email', authEmail)
    .maybeSingle()

  console.log('[strategy] Creator record found:', creator)

  const level = (creator?.level ?? 'Initiation') as CreatorLevel
  const showHashtags = canSeeHashtags(level)
  const showVideos = canSeeExampleVideos(level)

  const now = new Date()
  const monthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const today = now.toISOString().split('T')[0]

  let strategyId: string | null = null
  let strategyProducts: StrategyProduct[] = []
  let checklistEntries: { strategy_product_id: string; video_posted: boolean; live_done: boolean }[] = []
  let strategyMonthLabel: string = monthLabel
  let isFallbackStrategy = false

  if (creator) {
    let { data: stratData } = await supabase
      .from('strategies')
      .select('id, month')
      .eq('creator_id', creator.id)
      .eq('month', monthDate)
      .maybeSingle()

    console.log('[strategy] Strategy found for current month:', stratData)

    if (!stratData) {
      const { data: fallback } = await supabase
        .from('strategies')
        .select('id, month')
        .eq('creator_id', creator.id)
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fallback) {
        stratData = fallback
        isFallbackStrategy = true
        const [y, m] = fallback.month.split('-')
        strategyMonthLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        console.log('[strategy] Falling back to most recent strategy:', fallback)
      }
    }

    if (stratData) {
      strategyId = stratData.id
      const { data: products } = await supabase
        .from('strategy_products')
        .select(`
          *,
          product:products(id, name, niche, commission_rate, image_url),
          campaign:campaigns(id, brand_name, brand_logo_url),
          videos:strategy_videos(*)
        `)
        .eq('strategy_id', stratData.id)
        .order('created_at')

      const allProducts = (products ?? []) as StrategyProduct[]
      strategyProducts = allProducts.filter(
        (sp) => sp.product_id != null || (sp.external_product_name && sp.external_product_name.trim() !== '')
      )

      const { data: checklist } = await supabase
        .from('daily_checklist')
        .select('strategy_product_id, video_posted, live_done')
        .eq('creator_id', creator.id)
        .eq('date', today)

      checklistEntries = checklist ?? []
    }
  }

  // Fetch level_config for calendar
  const admin = createAdminClient()
  let levelConfigData: LevelConfig | null = null
  if (creator) {
    const { data: lcData } = await admin.from('level_config').select('*').eq('level_name', level).maybeSingle()
    levelConfigData = lcData as LevelConfig | null
  }

  // Fetch weekly calendar completions
  const weeklyChecklist: { date: string; completed: boolean; videos_done?: number }[] = []
  if (creator) {
    const now2 = new Date()
    const day = now2.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(now2)
    monday.setDate(now2.getDate() + diff)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const monStr = monday.toISOString().split('T')[0]
    const sunStr = sunday.toISOString().split('T')[0]

    const { data: calData } = await supabase
      .from('daily_checklist')
      .select('date, video_posted, videos_done')
      .eq('creator_id', creator.id)
      .eq('strategy_product_id', '00000000-0000-0000-0000-000000000000')
      .gte('date', monStr)
      .lte('date', sunStr)

    for (const row of calData ?? []) {
      weeklyChecklist.push({ date: row.date, completed: row.video_posted, videos_done: (row as Record<string, unknown>).videos_done as number | undefined })
    }
  }

  // Creative bank data from strategy_products
  const creativeProducts = strategyProducts
    .map((sp) => {
      const productName = sp.is_external
        ? (sp.external_product_name ?? '').trim()
        : (sp.product as { name: string } | null)?.name ?? ''
      if (!productName) return null
      return {
        id: sp.id,
        productName,
        hooks: (sp as unknown as { hooks?: string[] }).hooks ?? [],
        scripts: (sp as unknown as { scripts?: string | null }).scripts ?? null,
        trends: (sp as unknown as { trends?: string | null }).trends ?? null,
      }
    })
    .filter((p): p is { id: string; productName: string; hooks: string[]; scripts: string | null; trends: string | null } => p !== null)

  const hasChecklist = strategyProducts.some(
    (sp) => (sp.videos_per_day ?? 0) > 0 || (sp.live_hours_per_week ?? 0) > 0
  )

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav level={level} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Image
            src="https://nptkinihgouicdimytbf.supabase.co/storage/v1/object/public/PSC%20LOGOS/logo_pink.png"
            alt="Papaya Social Club"
            width={48}
            height={48}
          />
          <div>
            <h1 className="font-playfair text-4xl text-brand-black mb-1">Mi Estrategia</h1>
            <p className="font-dm-sans text-sm text-gray-500">{monthLabel}</p>
            {isFallbackStrategy && (
              <p className="font-dm-sans text-xs text-amber-700 bg-amber-50 border border-amber-200 inline-block mt-2 px-3 py-1 rounded-full">
                Mostrando tu estrategia más reciente ({strategyMonthLabel}). Tu estrategia de este mes aún no está lista.
              </p>
            )}
          </div>
        </div>

        {/* Daily Checklist */}
        {creator && hasChecklist && (
          <div className="mb-8">
            <DailyChecklist
              creatorId={creator.id}
              strategyProducts={strategyProducts.map((sp) => ({
                id: sp.id,
                product: sp.product as { name: string } | null,
                videos_per_day: sp.videos_per_day,
                live_hours_per_week: sp.live_hours_per_week,
              }))}
              checklistEntries={checklistEntries}
            />
          </div>
        )}

        {/* Tabbed content */}
        {creator && (
          <StrategyTabs
            level={level}
            creatorId={creator.id}
            weeklyChecklist={weeklyChecklist}
            levelConfigVideosPerDay={levelConfigData?.videos_per_day ?? 3}
            creativeProducts={creativeProducts}
            productsContent={
              (!strategyId || strategyProducts.length === 0) ? (
                <div className="bg-white rounded-2xl border border-brand-pink/20 p-10 text-center">
                  <p className="text-4xl mb-3">📋</p>
                  <h2 className="font-playfair text-2xl text-brand-black mb-2">
                    Aún no tienes una estrategia asignada para este mes.
                  </h2>
                  <p className="font-dm-sans text-gray-500 text-sm">
                    Tu account manager estará configurando tu estrategia pronto.{' '}
                    <a href="/products" className="text-brand-green font-semibold hover:underline">
                      ¡Mientras tanto, revisa tus productos! →
                    </a>
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {strategyProducts.map((sp) => {
                    const priorityStyle = PRIORITY_STYLES[sp.priority] ?? PRIORITY_STYLES.Supporting
                    const product = sp.product as { name: string; niche: string | null; commission_rate: number | null; image_url: string | null } | null
                    const campaign = sp.campaign as { brand_name: string } | null
                    const isExternal = !!sp.is_external || (!product && !!sp.external_product_name)
                    const displayName = isExternal
                      ? (sp.external_product_name?.trim() || 'Producto externo')
                      : (product?.name ?? 'Product')
                    const displayNiche = isExternal ? sp.external_brand : product?.niche
                    const displayCommission = isExternal ? sp.external_commission : product?.commission_rate
                    const displayImage = isExternal ? null : product?.image_url
                    const externalLink = isExternal ? sp.external_link : null

                    return (
                      <div key={sp.id} className="bg-white rounded-2xl border border-brand-pink/20 shadow-sm overflow-hidden">
                        {/* Product header */}
                        <div className="px-6 py-5 border-b border-gray-50 flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            {displayImage ? (
                              <img
                                src={displayImage}
                                alt={displayName}
                                className="w-14 h-14 object-cover rounded-xl border border-gray-100 shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-brand-light-pink flex items-center justify-center shrink-0">
                                <span className="font-playfair text-2xl text-brand-pink">
                                  {displayName.charAt(0) || '?'}
                                </span>
                              </div>
                            )}
                            <div>
                              <h2 className="font-playfair text-xl text-brand-black leading-tight flex items-center gap-2 flex-wrap">
                                {displayName}
                                {isExternal && (
                                  <span className="font-dm-sans text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
                                    Producto externo
                                  </span>
                                )}
                              </h2>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {displayNiche && (
                                  <span className="font-dm-sans text-xs bg-brand-light-pink text-brand-green px-2 py-0.5 rounded-full">
                                    {displayNiche}
                                  </span>
                                )}
                                {displayCommission != null && (
                                  <span className="font-dm-sans text-xs font-bold text-brand-pink">
                                    {displayCommission}% Comisión
                                  </span>
                                )}
                                {externalLink && (
                                  <a
                                    href={externalLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-dm-sans text-xs text-brand-green hover:underline"
                                  >
                                    Ver producto →
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className={`font-dm-sans text-xs font-bold px-3 py-1 rounded-full ${priorityStyle.badge}`}>
                              {sp.priority}
                            </span>
                            {sp.is_retainer && (
                              <span className="font-dm-sans text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                Campaña Retainer
                              </span>
                            )}
                            {campaign && (
                              <span className="font-dm-sans text-xs text-gray-400">{campaign.brand_name}</span>
                            )}
                            {sp.brief_url && (
                              <a
                                href={sp.brief_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-dm-sans text-xs font-semibold text-brand-green hover:underline"
                              >
                                Ver brief →
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 divide-x divide-gray-50 border-b border-gray-50">
                          <div className="px-5 py-4 text-center">
                            <p className="font-playfair text-2xl font-bold text-brand-black">{sp.videos_per_day ?? '–'}</p>
                            <p className="font-dm-sans text-xs text-gray-400 mt-0.5">Videos / Día</p>
                          </div>
                          <div className="px-5 py-4 text-center">
                            <p className="font-playfair text-2xl font-bold text-brand-black">{sp.live_hours_per_week ?? '–'}h</p>
                            <p className="font-dm-sans text-xs text-gray-400 mt-0.5">Live / Semana</p>
                          </div>
                          <div className="px-5 py-4 text-center">
                            <p className="font-playfair text-2xl font-bold text-brand-green">
                              {sp.gmv_target != null ? `$${Number(sp.gmv_target).toLocaleString('en-US')}` : '–'}
                            </p>
                            <p className="font-dm-sans text-xs text-gray-400 mt-0.5">Meta GMV</p>
                          </div>
                        </div>

                        {/* Video Focus */}
                        {sp.video_focus && (
                          <div className="px-6 py-4 border-b border-gray-50">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                              <span className="text-xl shrink-0 mt-0.5">🎯</span>
                              <div>
                                <h3 className="font-dm-sans text-xs font-semibold text-amber-700 uppercase tracking-widest mb-1">Enfoque del video</h3>
                                <p className="font-dm-sans text-sm text-amber-900 leading-relaxed">{sp.video_focus}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Quick Checklist */}
                        {sp.quick_checklist && sp.quick_checklist.length > 0 && (
                          <div className="px-6 py-4 border-b border-gray-50">
                            <h3 className="font-dm-sans text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Checklist rápido</h3>
                            <div className="flex flex-wrap gap-2">
                              {sp.quick_checklist.map((item, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 font-dm-sans text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                                  <span className="text-emerald-500">✓</span> {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Strategy note */}
                        {sp.strategy_note && (
                          <div className="px-6 py-4 border-b border-gray-50">
                            <h3 className="font-dm-sans text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Estrategia</h3>
                            <p className="font-dm-sans text-sm text-gray-700 leading-relaxed whitespace-pre-line">{sp.strategy_note}</p>
                          </div>
                        )}

                        {/* Hashtags — Growth+ only */}
                        {showHashtags && sp.hashtags && sp.hashtags.length > 0 && (
                          <div className="px-6 py-4 border-b border-gray-50">
                            <h3 className="font-dm-sans text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Hashtags</h3>
                            <div className="flex flex-wrap gap-2">
                              {sp.hashtags.map((tag, i) => (
                                <span key={i} className="font-dm-sans text-xs font-medium bg-brand-light-pink text-brand-green px-2.5 py-1 rounded-full">
                                  #{tag.replace('#', '')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Example videos — Growth+ only */}
                        {showVideos && sp.videos && sp.videos.length > 0 && (
                          <div className="px-6 py-4">
                            <h3 className="font-dm-sans text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Videos de ejemplo</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                              {sp.videos.map((video) => (
                                <VideoCard key={video.id} video={video} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Locked hint: hashtags/videos locked */}
                        {!showHashtags && (sp.hashtags?.length ?? 0) > 0 && (
                          <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-50">
                            <p className="font-dm-sans text-xs text-gray-400">
                              🔒 Hashtags y videos de ejemplo se desbloquean en <strong>Growth</strong>.
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            }
          />
        )}

        {!creator && (
          <div className="bg-white rounded-2xl border border-brand-pink/20 p-10 text-center">
            <p className="text-4xl mb-3">📋</p>
            <h2 className="font-playfair text-2xl text-brand-black mb-2">
              Aún no tienes una estrategia asignada para este mes.
            </h2>
            <p className="font-dm-sans text-gray-500 text-sm">
              Tu account manager estará configurando tu estrategia pronto.{' '}
              <a href="/products" className="text-brand-green font-semibold hover:underline">
                ¡Mientras tanto, revisa tus productos! →
              </a>
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
