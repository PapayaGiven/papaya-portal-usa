import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Creator, Task, Campaign, Product, LEVEL_CONFIG, StrategyProduct } from '@/lib/types'
import Nav from '@/components/Nav'
import SmartBanner from '@/components/SmartBanner'
import GMVRing from '@/components/GMVRing'
import DailyTasks from '@/components/DailyTasks'
import CampaignCard from '@/components/CampaignCard'
import ProductCard from '@/components/ProductCard'

function computeBanner(
  creator: Creator,
  tasks: Task[],
  campaigns: Campaign[],
  products: Product[]
): { type: 'urgent' | 'tasks' | 'products' | 'gmv'; title: string; message: string } | null {
  const now = new Date()

  // Priority 1: Campaign deadline within 24 hours
  const urgentCampaign = campaigns.find((c) => {
    if (!c.deadline) return false
    const deadline = new Date(c.deadline)
    return deadline.getTime() - now.getTime() < 24 * 60 * 60 * 1000 && deadline > now
  })
  if (urgentCampaign) {
    return {
      type: 'urgent',
      title: 'Kampagne läuft bald ab!',
      message: `${urgentCampaign.brand_name} endet in weniger als 24 Stunden. Bewerbe dich jetzt!`,
    }
  }

  // Priority 2: Incomplete tasks today
  const incompleteTasks = tasks.filter((t) => !t.completed)
  if (incompleteTasks.length > 0) {
    return {
      type: 'tasks',
      title: 'Du hast offene Aufgaben!',
      message: `${incompleteTasks.length} Aufgabe${incompleteTasks.length !== 1 ? 'n' : ''} noch offen für heute. Jetzt erledigen!`,
    }
  }

  // Priority 3: High commission products
  const highCommProduct = products.find(
    (p) => p.commission_rate !== null && p.commission_rate > 25
  )
  if (highCommProduct) {
    return {
      type: 'products',
      title: 'Top-Produkt verfügbar!',
      message: `${highCommProduct.name} bietet ${highCommProduct.commission_rate}% Provision. Jetzt promoten!`,
    }
  }

  // Priority 4: Close to next level
  const remaining = creator.gmv_target - creator.gmv
  if (remaining > 0 && remaining < 100) {
    const config = LEVEL_CONFIG[creator.level]
    return {
      type: 'gmv',
      title: 'Du bist fast da!',
      message: `Nur noch €${remaining.toFixed(0)} bis Level ${config.next ?? 'Elite'}. Gib Gas!`,
    }
  }

  return null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch creator
  const { data: creatorData } = await supabase
    .from('creators')
    .select('*')
    .eq('email', user.email!)
    .single()

  const creator = creatorData as Creator | null

  const today = new Date().toISOString().split('T')[0]

  // Fetch tasks with product join
  const { data: tasksData } = creator
    ? await supabase
        .from('tasks')
        .select('*, product:products(*)')
        .eq('creator_id', creator.id)
        .eq('date', today)
    : { data: [] }

  const tasks = (tasksData ?? []) as Task[]

  // Fetch active campaigns not expired
  const { data: campaignsData } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .or(`deadline.is.null,deadline.gt.${new Date().toISOString()}`)

  const campaigns = (campaignsData ?? []) as Campaign[]

  // Fetch top 5 products by commission_rate
  const { data: productsData } = await supabase
    .from('products')
    .select('*')
    .order('commission_rate', { ascending: false })
    .limit(5)

  const products = (productsData ?? []) as Product[]

  // Fetch current month strategy recap
  const now = new Date()
  const monthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthLabel = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
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
        .limit(4)
      strategyProducts = (spData ?? []) as StrategyProduct[]
    }
  }

  const totalVideosPerDay = strategyProducts.reduce((sum, p) => sum + (p.videos_per_day ?? 0), 0)
  const topStratProducts = strategyProducts
    .sort((a, b) => {
      const order = { Hero: 0, Secondary: 1, Supporting: 2 }
      return (order[a.priority] ?? 9) - (order[b.priority] ?? 9)
    })
    .slice(0, 2)

  // Smart banner
  const banner = creator
    ? computeBanner(creator, tasks, campaigns, products)
    : null

  const levelConfig = creator ? LEVEL_CONFIG[creator.level] : null
  const greeting = creator?.name
    ? `Hallo, ${creator.name.split(' ')[0]}! 👋`
    : 'Willkommen zurück! 👋'

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Greeting row */}
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <Image
            src="https://cgimvsmnfmpzpkakiguo.supabase.co/storage/v1/object/public/PSC%20LOGOS/Sun_pink.png"
            alt=""
            width={180}
            height={180}
            className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none select-none"
            aria-hidden="true"
          />
          <div>
            <h1 className="font-playfair text-3xl text-brand-black">{greeting}</h1>
            <p className="font-dm-sans text-sm text-gray-500 mt-1">
              {new Date().toLocaleDateString('de-DE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Level badge - inside relative container, ensure z-index above watermark */}
          {creator && (
            <div className="flex items-center gap-2">
              <span className="font-dm-sans text-xs font-semibold uppercase tracking-widest text-gray-400">
                Level
              </span>
              <span
                className="font-dm-sans font-bold text-sm px-3 py-1 rounded-full text-white"
                style={{ backgroundColor: levelConfig?.color ?? '#9CA3AF' }}
              >
                {creator.level}
              </span>
              {creator.streak > 0 && (
                <span className="font-dm-sans text-sm text-amber-500 font-semibold">
                  🔥 {creator.streak} Tage
                </span>
              )}
            </div>
          )}
        </div>

        {/* Smart Banner */}
        {banner && (
          <div className="mb-6">
            <SmartBanner banner={banner} />
          </div>
        )}

        {/* No creator account yet */}
        {!creator && (
          <div className="bg-white rounded-2xl border border-brand-pink/20 p-8 text-center mb-6">
            <p className="text-4xl mb-3">🌴</p>
            <h2 className="font-playfair text-2xl text-brand-black mb-2">
              Dein Profil wird eingerichtet.
            </h2>
            <p className="font-dm-sans text-gray-500 text-sm">
              Deine Agentur wird dein Creator-Profil in Kürze aktivieren.
            </p>
          </div>
        )}

        {/* Main content grid */}
        {creator && (
          <>
            {/* Strategy Recap + Community + Education row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {/* Strategy Recap */}
              <div className="sm:col-span-1 bg-white rounded-2xl border border-brand-pink/20 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-dm-sans text-xs font-semibold uppercase tracking-widest text-gray-400">My Strategy</h3>
                    <span className="font-dm-sans text-xs text-gray-400">{monthLabel}</span>
                  </div>
                  {strategyProducts.length > 0 ? (
                    <div className="space-y-2">
                      {topStratProducts.map((sp) => {
                        const prod = sp.product as { name: string } | null
                        return (
                          <div key={sp.id} className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${sp.priority === 'Hero' ? 'bg-amber-400' : 'bg-brand-pink'}`} />
                            <span className="font-dm-sans text-sm text-brand-black truncate">{prod?.name ?? '–'}</span>
                          </div>
                        )
                      })}
                      {totalVideosPerDay > 0 && (
                        <p className="font-dm-sans text-xs text-gray-400 mt-2">
                          {totalVideosPerDay} Videos / Tag insgesamt
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="font-dm-sans text-sm text-gray-400">Noch keine Strategie für diesen Monat.</p>
                  )}
                </div>
                <Link
                  href="/strategy"
                  className="mt-4 font-dm-sans text-xs font-semibold text-brand-green hover:underline"
                >
                  Vollständige Strategie ansehen →
                </Link>
              </div>

              {/* Community */}
              <a
                href={process.env.NEXT_PUBLIC_WHATSAPP_LINK ?? 'https://chat.whatsapp.com/EgJyUolGIcoIihVjjnuEKL'}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brand-pink/10 hover:bg-brand-pink/20 border border-brand-pink/30 rounded-2xl p-5 flex flex-col justify-between transition group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-brand-pink/20 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-brand-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <h3 className="font-dm-sans font-semibold text-sm text-brand-black mb-1">Comunidad</h3>
                  <p className="font-dm-sans text-xs text-gray-500">WhatsApp-Gruppe der Papaya Creators</p>
                </div>
                <span className="mt-3 font-dm-sans text-xs font-semibold text-brand-pink group-hover:underline">
                  Gruppe beitreten →
                </span>
              </a>

              {/* Education */}
              <a
                href={process.env.NEXT_PUBLIC_KAJABI_LINK ?? 'https://papaya-given.mykajabi.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brand-green/5 hover:bg-brand-green/10 border border-brand-green/20 rounded-2xl p-5 flex flex-col justify-between transition group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="font-dm-sans font-semibold text-sm text-brand-black mb-1">Educación</h3>
                  <p className="font-dm-sans text-xs text-gray-500">Trainings & Ressourcen für TikTok-Erfolg</p>
                </div>
                <span className="mt-3 font-dm-sans text-xs font-semibold text-brand-green group-hover:underline">
                  Kurse öffnen →
                </span>
              </a>
            </div>

            {/* GMV + Tasks side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <GMVRing
                gmv={creator.gmv}
                target={creator.gmv_target}
                level={creator.level}
                nextLevel={levelConfig?.next ?? null}
              />
              <DailyTasks tasks={tasks} creatorId={creator.id} />
            </div>

            {/* Campaigns */}
            {campaigns.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-playfair text-2xl text-brand-black">
                    Aktuelle Kampagnen
                  </h2>
                  <span className="font-dm-sans text-xs text-gray-400">
                    {campaigns.length} aktiv
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {campaigns.map((campaign) => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              </section>
            )}

            {/* Top Products */}
            {products.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-playfair text-2xl text-brand-black">
                    Top Produkte
                  </h2>
                  <span className="font-dm-sans text-xs text-gray-400">
                    Nach Provision
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
