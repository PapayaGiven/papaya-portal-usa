import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Creator, Task, Campaign, Product, LEVEL_CONFIG } from '@/lib/types'
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
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

          {/* Level badge */}
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
