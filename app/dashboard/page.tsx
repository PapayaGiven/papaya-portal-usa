import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Creator, Campaign, Product, LEVEL_CONFIG, LEVEL_BADGE_COLORS, StrategyProduct, SiteSettings, LevelConfig, PapayaPick } from '@/lib/types'
import Nav from '@/components/Nav'
import GMVRing from '@/components/GMVRing'
import LevelUpCelebration from '@/components/LevelUpCelebration'
import InitiationProductModal from '@/components/InitiationProductModal'
import AnnouncementBanner from '@/components/AnnouncementBanner'
import DashboardExtras from './DashboardExtras'
import SmartAlert, { type Alert } from '@/components/SmartAlert'
import VideoProgressBar from '@/components/VideoProgressBar'
import DailyVideoPlan from '@/components/DailyVideoPlan'
import { canSeeCampaigns, canSeePapayaPicks } from '@/lib/levelAccess'

function dailyTargetForStrategyProduct(sp: { videos_per_day: number | null; frequency_type?: string | null }): number {
  const raw = sp.videos_per_day ?? 0
  if (raw <= 0) return 0
  return sp.frequency_type === 'week' ? Math.max(1, Math.ceil(raw / 7)) : raw
}

function pickAlert(input: {
  campaigns: Campaign[]
  creator: Creator
  monthlyGoal: number
  papayaPicks: PapayaPick[]
  canSeePicks: boolean
}): Alert | null {
  const { campaigns, creator, monthlyGoal, papayaPicks, canSeePicks } = input
  const now = new Date()

  // 1. Campaign closing in < 48h — highest priority
  const horizon = 48 * 60 * 60 * 1000
  const closing = campaigns
    .filter((c) => {
      if (!c.deadline) return false
      const ms = new Date(c.deadline).getTime() - now.getTime()
      return ms > 0 && ms < horizon
    })
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0]
  if (closing) {
    const hours = Math.max(1, Math.round((new Date(closing.deadline!).getTime() - now.getTime()) / (60 * 60 * 1000)))
    return {
      kind: 'campaign',
      title: 'Campaña por cerrar',
      message: `${closing.brand_name} cierra en ${hours}h. Aplica antes que se acabe.`,
      href: `/campaigns/${closing.id}`,
      cta: 'Aplicar →',
    }
  }

  // 2. GMV behind goal past day 15
  if (now.getUTCDate() >= 15 && monthlyGoal > 0) {
    const ratio = creator.gmv / monthlyGoal
    if (ratio < 0.7) {
      return {
        kind: 'gmv-behind',
        title: 'Estás por debajo de tu meta',
        message: 'Estás por debajo de tu meta — replica tu mejor video o pide ayuda a tu manager.',
        href: '/strategy',
        cta: 'Ver estrategia →',
      }
    }
  }

  // 3. New Papaya Pick — Foundation+
  if (canSeePicks && papayaPicks.length > 0) {
    const top = papayaPicks[0]
    return {
      kind: 'papaya-pick',
      title: 'Nueva Papaya Pick',
      message: `Nueva Papaya Pick disponible — ${top.product_name} tiene alto potencial esta semana.`,
      href: '/papaya-picks',
      cta: 'Ver Papaya Picks →',
    }
  }

  return null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creatorData } = await supabase
    .from('creators')
    .select('*')
    .eq('email', user.email!)
    .single()

  const creator = creatorData as Creator | null
  const level = creator?.level ?? 'Initiation'
  const isInitiation = level === 'Initiation'

  // Active campaigns (Foundation+)
  let campaigns: Campaign[] = []
  if (creator && canSeeCampaigns(level)) {
    const { data: campaignsData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .or(`deadline.is.null,deadline.gt.${new Date().toISOString()}`)
    campaigns = (campaignsData ?? []) as Campaign[]
  }

  const admin = createAdminClient()
  let products: Product[] = []
  let initiationModalProducts: Product[] = []
  let showInitiationModal = false

  if (creator && isInitiation) {
    const { data: selections } = await supabase
      .from('creator_initiation_products')
      .select('product_id')
      .eq('creator_id', creator.id)

    if (!selections || selections.length === 0) {
      showInitiationModal = true
      const { data: approved } = await admin
        .from('products')
        .select('*')
        .eq('approved_for_initiation', true)
        .order('commission_rate', { ascending: false })
      initiationModalProducts = (approved ?? []) as Product[]
    } else {
      const ids = selections.map((s) => s.product_id)
      const { data: selected } = await admin.from('products').select('*').in('id', ids)
      products = (selected ?? []) as Product[]
    }
  } else if (creator) {
    const { data: all } = await admin
      .from('products')
      .select('*')
      .order('commission_rate', { ascending: false })
      .limit(6)
    products = (all ?? []) as Product[]
  }

  // Strategy products for "Tu plan de hoy"
  const now = new Date()
  const monthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  let strategyProducts: StrategyProduct[] = []
  if (creator) {
    const { data: stratData } = await supabase
      .from('strategies')
      .select('id')
      .eq('creator_id', creator.id)
      .eq('month', monthDate)
      .maybeSingle()
    if (stratData) {
      const { data: spData } = await supabase
        .from('strategy_products')
        .select('*, product:products(id, name, commission_rate)')
        .eq('strategy_id', stratData.id)
        .order('created_at')
      strategyProducts = (spData ?? []) as StrategyProduct[]
    }
  }

  // Settings (booking links + agency goal)
  const { data: settingsData } = await admin.from('settings').select('*').limit(1).maybeSingle()
  const siteSettings = settingsData as SiteSettings | null

  // Level config (fallback for daily video target)
  let levelConfigData: LevelConfig | null = null
  if (creator) {
    const { data: lcData } = await admin.from('level_config').select('*').eq('level_name', creator.level).maybeSingle()
    levelConfigData = lcData as LevelConfig | null
  }

  // Videos posted today — count + by-product breakdown
  let videosToday = 0
  const completedByProductId: Record<string, number> = {}
  if (creator) {
    const today = new Date()
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString()
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1)).toISOString()
    const { data: vids } = await supabase
      .from('creator_videos')
      .select('product_id')
      .eq('creator_id', creator.id)
      .gte('created_at', start)
      .lt('created_at', end)
    for (const v of vids ?? []) {
      videosToday++
      if (v.product_id) completedByProductId[v.product_id] = (completedByProductId[v.product_id] ?? 0) + 1
    }
  }

  // Daily video target Y — sum strategy or fall back to level config
  const strategyTarget = strategyProducts.reduce(
    (sum, sp) => sum + dailyTargetForStrategyProduct(sp),
    0,
  )
  const dailyVideoTarget = strategyTarget > 0
    ? strategyTarget
    : (creator?.custom_videos_per_day ?? levelConfigData?.videos_per_day ?? 0)

  // Inbox + open deliverables
  type NotifRow = { id: string; title: string; message: string | null; type: string | null; created_at: string }
  type DeliverableForCreator = { id: string; brand_name: string; deliverable_type: string; due_date: string | null; status: string; notes: string | null }
  let unreadNotifications: NotifRow[] = []
  let openDeliverables: DeliverableForCreator[] = []
  if (creator) {
    const [notifRes, dlvRes] = await Promise.all([
      supabase
        .from('creator_notifications')
        .select('id, title, message, type, created_at')
        .eq('creator_id', creator.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('deliverables')
        .select('id, brand_name, deliverable_type, due_date, status, notes')
        .eq('creator_id', creator.id)
        .neq('status', 'done')
        .order('due_date', { ascending: true })
        .limit(20),
    ])
    unreadNotifications = (notifRes.data ?? []) as NotifRow[]
    openDeliverables = (dlvRes.data ?? []) as DeliverableForCreator[]
  }

  const { data: announcementsData } = await admin
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5)
  const activeAnnouncements = (announcementsData ?? []) as { id: string; title: string; body: string | null; image_url: string | null; created_at: string }[]

  // Papaya Picks for the smart alert
  const canSeePicks = creator ? canSeePapayaPicks(level) : false
  let papayaPicks: PapayaPick[] = []
  if (creator && canSeePicks) {
    const { data: picksData } = await admin
      .from('papaya_picks')
      .select('*')
      .eq('is_active', true)
      .order('papaya_pick_score', { ascending: false })
      .limit(3)
    papayaPicks = ((picksData ?? []) as PapayaPick[]).filter((p) => !p.expires_at || new Date(p.expires_at) > new Date())
  }

  // Monthly goal: prefer personal, fall back to level threshold
  const personalGoal = creator?.personal_gmv_goal ?? 0
  const fallbackLevelGoal = creator ? (LEVEL_CONFIG[creator.level].target ?? creator.gmv_target) : 0
  const monthlyGoal = personalGoal > 0 ? personalGoal : fallbackLevelGoal

  const alert = creator
    ? pickAlert({ campaigns, creator, monthlyGoal, papayaPicks, canSeePicks })
    : null

  // Top 2 products by commission
  const topTwoProducts = [...products]
    .filter((p) => p.commission_rate != null)
    .sort((a, b) => (b.commission_rate ?? 0) - (a.commission_rate ?? 0))
    .slice(0, 2)

  const firstName = creator?.name?.split(' ')[0] ?? null

  // Booking link
  const bookingLinkKey = `booking_link_${level.toLowerCase()}` as keyof SiteSettings
  const fallbackBooking = (siteSettings?.[bookingLinkKey] as string | null | undefined) ?? null
  const bookingLink = creator?.booking_link || fallbackBooking || null

  const whatsappCommunity = process.env.NEXT_PUBLIC_WHATSAPP_LINK ?? 'https://chat.whatsapp.com/EgJyUolGIcoIihVjjnuEKL'
  const kajabiUrl = process.env.NEXT_PUBLIC_KAJABI_LINK ?? 'https://papaya-given.mykajabi.com'

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav level={creator?.level ?? null} />

      {creator && <LevelUpCelebration creatorId={creator.id} currentLevel={creator.level} />}

      {showInitiationModal && creator && initiationModalProducts.length > 0 && (
        <InitiationProductModal products={initiationModalProducts} creatorId={creator.id} />
      )}

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <DashboardExtras notifications={unreadNotifications} deliverables={openDeliverables} />

        {/* 1. Header */}
        <header className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Image
            src="https://nptkinihgouicdimytbf.supabase.co/storage/v1/object/public/PSC%20LOGOS/Sun_pink.png"
            alt=""
            width={140}
            height={140}
            className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none select-none"
            aria-hidden="true"
          />
          <div>
            <h1 className="font-playfair text-3xl text-brand-black">
              {firstName ? `¡Hola, ${firstName}!` : '¡Bienvenida de nuevo!'}
            </h1>
            <p className="font-dm-sans text-sm text-gray-500 mt-1">
              {now.toLocaleDateString('es-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {creator && (
            <div className="flex items-center gap-2">
              <span className="font-dm-sans text-xs font-semibold uppercase tracking-widest text-gray-400">Level</span>
              <span
                className="font-dm-sans font-bold text-sm px-3 py-1 rounded-full"
                style={{
                  backgroundColor: LEVEL_BADGE_COLORS[creator.level]?.bg ?? '#F1EFE8',
                  color: LEVEL_BADGE_COLORS[creator.level]?.text ?? '#444441',
                }}
              >
                {creator.level}
              </span>
            </div>
          )}
        </header>

        {!creator && (
          <div className="bg-white rounded-2xl border border-brand-pink/20 p-8 text-center">
            <p className="text-4xl mb-3">🌴</p>
            <h2 className="font-playfair text-2xl text-brand-black mb-2">Tu perfil se está configurando.</h2>
            <p className="font-dm-sans text-gray-500 text-sm">Tu agencia activará tu perfil de creadora pronto.</p>
          </div>
        )}

        {creator && (
          <>
            {activeAnnouncements.length > 0 && (
              <AnnouncementBanner announcements={activeAnnouncements} />
            )}

            {/* 2. GMV ring — toward monthly goal */}
            <GMVRing
              gmv={creator.gmv}
              target={monthlyGoal}
              level={creator.level}
              nextLevel={null}
              mode="monthly"
            />

            {/* 3. Videos progress bar */}
            <VideoProgressBar done={videosToday} target={dailyVideoTarget} />

            {/* 4. Tu plan de hoy — strategy as checklist */}
            <DailyVideoPlan
              items={strategyProducts.map((sp) => ({
                id: sp.id,
                product: sp.product ? { id: sp.product.id, name: sp.product.name } : null,
                videos_per_day: sp.videos_per_day,
                frequency_type: (sp.frequency_type ?? 'day') as 'day' | 'week',
                priority: sp.priority,
              }))}
              completedByProductId={completedByProductId}
            />

            {/* 5. Smart alert — one most urgent */}
            {alert && <SmartAlert alert={alert} />}

            {/* 6. Top productos — 2 cards */}
            {topTwoProducts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-playfair text-xl text-brand-black">Top productos</h2>
                  <Link href="/products" className="font-dm-sans text-sm text-brand-green hover:underline">
                    Ver todos →
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {topTwoProducts.map((p) => (
                    <Link
                      key={p.id}
                      href="/products"
                      className="bg-white border border-gray-100 rounded-2xl p-3 flex flex-col gap-2 hover:shadow-sm transition"
                    >
                      <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden">
                        {p.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
                        )}
                      </div>
                      <p className="font-dm-sans text-sm font-semibold text-brand-black line-clamp-2 leading-snug">
                        {p.name}
                      </p>
                      <p className="font-dm-sans text-lg font-bold text-brand-green">{p.commission_rate}%</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 7. Success Guardian */}
            {creator.account_manager_name && (
              <section className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="font-dm-sans text-xs font-bold uppercase tracking-widest text-brand-green mb-2">
                  Tu Success Guardian
                </p>
                <p className="font-playfair text-2xl text-brand-black mb-3">{creator.account_manager_name}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  {creator.account_manager_whatsapp && (
                    <a
                      href={`https://wa.me/${creator.account_manager_whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-green text-white font-dm-sans text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-green/90 transition"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WhatsApp →
                    </a>
                  )}
                  {bookingLink ? (
                    <a
                      href={bookingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center bg-brand-green text-white font-dm-sans text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-green/90 transition"
                    >
                      Reserva tu llamada 1:1 →
                    </a>
                  ) : (
                    <div className="flex-1 inline-flex items-center justify-center bg-amber-50 border border-amber-200 text-amber-700 font-dm-sans text-xs px-4 py-2.5 rounded-xl text-center">
                      Tu link de agendamiento estará disponible pronto
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 8. Community + Education small cards */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={whatsappCommunity}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brand-pink/10 hover:bg-brand-pink/20 border border-brand-pink/30 rounded-2xl p-4 flex flex-col gap-2 transition group"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-pink/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-brand-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <p className="font-dm-sans font-semibold text-sm text-brand-black">Comunidad</p>
                <span className="font-dm-sans text-xs font-semibold text-brand-pink group-hover:underline mt-auto">
                  Unirse al grupo →
                </span>
              </a>
              <a
                href={kajabiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brand-green/5 hover:bg-brand-green/10 border border-brand-green/20 rounded-2xl p-4 flex flex-col gap-2 transition group"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-green/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="font-dm-sans font-semibold text-sm text-brand-black">Educación</p>
                <span className="font-dm-sans text-xs font-semibold text-brand-green group-hover:underline mt-auto">
                  Ver cursos →
                </span>
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
