import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Nav from '@/components/Nav'
import DailyChecklist from '@/components/DailyChecklist'
import { StrategyProduct, CreatorLevel } from '@/lib/types'
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
          <p className="font-dm-sans text-xs text-gray-400">Watch on TikTok</p>
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

  const { data: creator } = await supabase
    .from('creators')
    .select('id, name, level')
    .eq('email', user.email!)
    .single()

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

  if (creator) {
    const { data: stratData } = await supabase
      .from('strategies')
      .select('id')
      .eq('creator_id', creator.id)
      .eq('month', monthDate)
      .maybeSingle()

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

      strategyProducts = (products ?? []) as StrategyProduct[]

      const { data: checklist } = await supabase
        .from('daily_checklist')
        .select('strategy_product_id, video_posted, live_done')
        .eq('creator_id', creator.id)
        .eq('date', today)

      checklistEntries = checklist ?? []
    }
  }

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
            src="https://cgimvsmnfmpzpkakiguo.supabase.co/storage/v1/object/public/PSC%20LOGOS/logo_pink.png"
            alt="Papaya Social Club"
            width={48}
            height={48}
          />
          <div>
            <h1 className="font-playfair text-4xl text-brand-black mb-1">My Strategy</h1>
            <p className="font-dm-sans text-sm text-gray-500">{monthLabel}</p>
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

        {/* No strategy yet */}
        {(!strategyId || strategyProducts.length === 0) ? (
          <div className="bg-white rounded-2xl border border-brand-pink/20 p-10 text-center">
            <p className="text-4xl mb-3">📋</p>
            <h2 className="font-playfair text-2xl text-brand-black mb-2">
              No strategy yet for {monthLabel}
            </h2>
            <p className="font-dm-sans text-gray-500 text-sm">
              Your agency will create your monthly strategy soon.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {strategyProducts.map((sp) => {
              const priorityStyle = PRIORITY_STYLES[sp.priority] ?? PRIORITY_STYLES.Supporting
              const product = sp.product as { name: string; niche: string | null; commission_rate: number | null; image_url: string | null } | null
              const campaign = sp.campaign as { brand_name: string } | null

              return (
                <div key={sp.id} className="bg-white rounded-2xl border border-brand-pink/20 shadow-sm overflow-hidden">
                  {/* Product header */}
                  <div className="px-6 py-5 border-b border-gray-50 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {product?.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product?.name}
                          className="w-14 h-14 object-cover rounded-xl border border-gray-100 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-brand-light-pink flex items-center justify-center shrink-0">
                          <span className="font-playfair text-2xl text-brand-pink">
                            {product?.name?.charAt(0) ?? '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <h2 className="font-playfair text-xl text-brand-black leading-tight">
                          {product?.name ?? 'Product'}
                        </h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {product?.niche && (
                            <span className="font-dm-sans text-xs bg-brand-light-pink text-brand-green px-2 py-0.5 rounded-full">
                              {product.niche}
                            </span>
                          )}
                          {product?.commission_rate != null && (
                            <span className="font-dm-sans text-xs font-bold text-brand-pink">
                              {product.commission_rate}% Commission
                            </span>
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
                          Retainer Campaign
                        </span>
                      )}
                      {campaign && (
                        <span className="font-dm-sans text-xs text-gray-400">{campaign.brand_name}</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 divide-x divide-gray-50 border-b border-gray-50">
                    <div className="px-5 py-4 text-center">
                      <p className="font-playfair text-2xl font-bold text-brand-black">{sp.videos_per_day ?? '–'}</p>
                      <p className="font-dm-sans text-xs text-gray-400 mt-0.5">Videos / Day</p>
                    </div>
                    <div className="px-5 py-4 text-center">
                      <p className="font-playfair text-2xl font-bold text-brand-black">{sp.live_hours_per_week ?? '–'}h</p>
                      <p className="font-dm-sans text-xs text-gray-400 mt-0.5">Live / Week</p>
                    </div>
                    <div className="px-5 py-4 text-center">
                      <p className="font-playfair text-2xl font-bold text-brand-green">
                        {sp.gmv_target != null ? `€${Number(sp.gmv_target).toLocaleString('en-DE')}` : '–'}
                      </p>
                      <p className="font-dm-sans text-xs text-gray-400 mt-0.5">GMV Target</p>
                    </div>
                  </div>

                  {/* Strategy note */}
                  {sp.strategy_note && (
                    <div className="px-6 py-4 border-b border-gray-50">
                      <h3 className="font-dm-sans text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Strategy</h3>
                      <p className="font-dm-sans text-sm text-gray-700 leading-relaxed whitespace-pre-line">{sp.strategy_note}</p>
                    </div>
                  )}

                  {/* Hashtags — Pro+ only */}
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

                  {/* Example videos — Pro+ only */}
                  {showVideos && sp.videos && sp.videos.length > 0 && (
                    <div className="px-6 py-4">
                      <h3 className="font-dm-sans text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Example Videos</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {sp.videos.map((video) => (
                          <VideoCard key={video.id} video={video} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rising hint: hashtags/videos locked */}
                  {!showHashtags && (sp.hashtags?.length ?? 0) > 0 && (
                    <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-50">
                      <p className="font-dm-sans text-xs text-gray-400">
                        🔒 Hashtags and example videos unlock at <strong>Pro</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
