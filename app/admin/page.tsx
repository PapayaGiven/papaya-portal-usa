import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminLogin from '@/components/admin/AdminLogin'
import AdminPanel from '@/components/admin/AdminPanel'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const adminSession = cookieStore.get('admin_session')

  if (adminSession?.value !== 'valid') {
    return <AdminLogin />
  }

  const supabase = createAdminClient()

  const [creatorsRes, productsRes, campaignsRes, applicationsRes, productRequestsRes, initiationSelectionsRes, levelsRes, rewardsRes, creatorRewardsRes, settingsRes, deliverablesRes, levelConfigRes, violationsRes, announcementsRes, papayaPicksRes] = await Promise.all([
    supabase
      .from('creators')
      .select('*')
      .order('gmv', { ascending: false }),
    supabase
      .from('products')
      .select('*')
      .order('commission_rate', { ascending: false }),
    supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('campaign_applications')
      .select('*, creator:creators(name, email), campaign:campaigns(brand_name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('product_requests')
      .select('*, creator:creators(name, email)')
      .order('created_at', { ascending: false }),
    supabase
      .from('creator_initiation_products')
      .select('creator_id, product_id, product:products(name), creator:creators(name, email)')
      .order('selected_at', { ascending: false }),
    supabase
      .from('levels')
      .select('*')
      .order('order_index'),
    supabase
      .from('rewards')
      .select('*')
      .order('level_name, order_index'),
    supabase
      .from('creator_rewards')
      .select('*, creator:creators(name, email), reward:rewards(title, level_name)')
      .order('claimed_at', { ascending: false }),
    supabase
      .from('settings')
      .select('*')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('deliverables')
      .select('*, creator:creators(name, email)')
      .order('due_date', { ascending: true }),
    supabase
      .from('level_config')
      .select('*')
      .order('level_name'),
    supabase
      .from('violations')
      .select('*, creator:creators(name, email)')
      .order('created_at', { ascending: false }),
    supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('papaya_picks')
      .select('*')
      .order('papaya_pick_score', { ascending: false }),
  ])

  // Surface fetch errors in the server log so future regressions don't
  // silently render an empty admin tab.
  for (const [name, res] of [
    ['creators', creatorsRes], ['products', productsRes], ['campaigns', campaignsRes],
    ['applications', applicationsRes], ['product_requests', productRequestsRes],
    ['initiation_selections', initiationSelectionsRes], ['levels', levelsRes],
    ['rewards', rewardsRes], ['creator_rewards', creatorRewardsRes],
    ['settings', settingsRes], ['deliverables', deliverablesRes],
    ['level_config', levelConfigRes], ['violations', violationsRes],
    ['announcements', announcementsRes], ['papaya_picks', papayaPicksRes],
  ] as const) {
    if (res.error) console.error(`[admin] ${name} fetch error:`, res.error.message)
  }

  // Merge campaign_products into campaigns separately, since the embedded
  // join was failing silently when the relationship couldn't be resolved.
  const campaignProductsRes = await supabase.from('campaign_products').select('campaign_id, product_id')
  if (campaignProductsRes.error) console.error('[admin] campaign_products fetch error:', campaignProductsRes.error.message)
  const cpByCampaign = new Map<string, { product_id: string }[]>()
  for (const row of campaignProductsRes.data ?? []) {
    const arr = cpByCampaign.get(row.campaign_id) ?? []
    arr.push({ product_id: row.product_id })
    cpByCampaign.set(row.campaign_id, arr)
  }
  const campaignsWithProducts = (campaignsRes.data ?? []).map((c) => ({
    ...c,
    campaign_products: cpByCampaign.get(c.id) ?? [],
  }))

  return (
    <AdminPanel
      creators={creatorsRes.data ?? []}
      products={productsRes.data ?? []}
      campaigns={campaignsWithProducts}
      applications={applicationsRes.data ?? []}
      productRequests={productRequestsRes.data ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initiationSelections={(initiationSelectionsRes.data ?? []) as any}
      levels={levelsRes.data ?? []}
      rewards={rewardsRes.data ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      creatorRewards={(creatorRewardsRes.data ?? []) as any}
      settings={settingsRes.data ?? null}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deliverables={(deliverablesRes.data ?? []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      levelConfigs={(levelConfigRes.data ?? []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      violations={(violationsRes.data ?? []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      announcements={(announcementsRes.data ?? []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      papayaPicks={(papayaPicksRes.data ?? []) as any}
    />
  )
}
