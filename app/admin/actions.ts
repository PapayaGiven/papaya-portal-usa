'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { CreatorLevel, LEVEL_CONFIG } from '@/lib/types'

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function adminLogin(password: string): Promise<{ error?: string }> {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Wrong password.' }
  }
  const cookieStore = await cookies()
  cookieStore.set('admin_session', 'valid', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24,
    path: '/',
    sameSite: 'lax',
  })
  redirect('/admin')
}

export async function adminLogout() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  redirect('/admin')
}

// ── Creators ──────────────────────────────────────────────────────────────────

export async function updateCreatorGMV(id: string, gmv: number): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  let newLevel: CreatorLevel = 'Initiation'
  if (gmv >= 5000) newLevel = 'Elite'
  else if (gmv >= 1000) newLevel = 'Pro'
  else if (gmv >= 300) newLevel = 'Rising'

  const newTarget = LEVEL_CONFIG[newLevel].target ?? 5000

  const { error } = await supabase
    .from('creators')
    .update({ gmv, level: newLevel, gmv_target: newTarget })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

export async function updateCreatorLevel(id: string, level: CreatorLevel): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const newTarget = LEVEL_CONFIG[level].target ?? 5000

  const { error } = await supabase
    .from('creators')
    .update({ level, gmv_target: newTarget })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

export async function updateCreatorPersonalGoal(id: string, goal: number): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('creators')
    .update({ personal_gmv_goal: goal })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return {}
}

export async function toggleCreatorActive(id: string, isActive: boolean): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('creators').update({ is_active: isActive }).eq('id', id)
  revalidatePath('/admin')
}

export async function addCreator(name: string, email: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { error: dbError } = await supabase.from('creators').insert({ name, email })
  if (dbError) return { error: dbError.message }

  const { error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/confirm`,
  })
  if (authError) return { error: `Creator created, but invite failed: ${authError.message}` }

  revalidatePath('/admin')
  return {}
}

export async function resendInvite(email: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/confirm`,
  })
  if (error) return { error: error.message }
  return {}
}

export async function deleteCreator(id: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { data: creator } = await supabase
    .from('creators')
    .select('email')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('creators').delete().eq('id', id)
  if (error) return { error: error.message }

  if (creator?.email) {
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const authUser = users.find((u) => u.email === creator.email)
    if (authUser) {
      await supabase.auth.admin.deleteUser(authUser.id)
    }
  }

  revalidatePath('/admin')
  return {}
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function addProduct(data: {
  name: string
  commission_rate: number
  conversion_rate: number
  is_exclusive: boolean
  niche: string
  image_url: string | null
  product_link: string | null
  tags: string[]
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('products').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string
    commission_rate: number
    conversion_rate: number
    is_exclusive: boolean
    niche: string
    image_url: string | null
    product_link: string | null
    tags: string[]
  }>
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('products').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('products').delete().eq('id', id)
  revalidatePath('/admin')
}

export async function toggleProductExclusive(id: string, isExclusive: boolean): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('products').update({ is_exclusive: isExclusive }).eq('id', id)
  revalidatePath('/admin')
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export async function addCampaign(data: {
  brand_name: string
  description: string
  commission_rate: number
  spots_left: number
  deadline: string
  min_level: CreatorLevel
  status: string
  brand_logo_url: string | null
  product_id: string | null
  budget: number | null
  product_link: string | null
  sample_available: boolean
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('campaigns').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

export async function updateCampaignSpots(id: string, spots: number): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('campaigns').update({ spots_left: spots }).eq('id', id)
  revalidatePath('/admin')
}

export async function toggleCampaignStatus(id: string, currentStatus: string): Promise<void> {
  const supabase = createAdminClient()
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
  await supabase.from('campaigns').update({ status: newStatus }).eq('id', id)
  revalidatePath('/admin')
}

export async function deleteCampaign(id: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('campaigns').delete().eq('id', id)
  revalidatePath('/admin')
}

// ── Tasks (kept for data compatibility) ───────────────────────────────────────

export async function assignTask(data: {
  creator_id: string
  product_id: string
  task_name: string
  is_hero: boolean
  date?: string
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const taskDate = data.date || new Date().toISOString().split('T')[0]
  const { error } = await supabase.from('tasks').insert({ ...data, date: taskDate })
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

export async function bulkAssignTask(data: {
  level: CreatorLevel
  product_id: string
  task_name: string
  is_hero: boolean
}): Promise<{ error?: string; count?: number }> {
  const supabase = createAdminClient()

  const { data: creators, error: creatorError } = await supabase
    .from('creators')
    .select('id')
    .eq('level', data.level)
    .eq('is_active', true)

  if (creatorError) return { error: creatorError.message }
  if (!creators || creators.length === 0)
    return { error: 'No active creators at this level.' }

  const today = new Date().toISOString().split('T')[0]
  const tasks = creators.map((c) => ({
    creator_id: c.id,
    product_id: data.product_id,
    task_name: data.task_name,
    is_hero: data.is_hero,
    date: today,
  }))

  const { error } = await supabase.from('tasks').insert(tasks)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { count: tasks.length }
}

// ── Product Requests ──────────────────────────────────────────────────────────

export async function updateProductRequestStatus(id: string, status: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('product_requests').update({ status }).eq('id', id)
  revalidatePath('/admin')
}

// ── Initiation Products ────────────────────────────────────────────────────────

export async function toggleProductInitiation(id: string, approved: boolean): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('products').update({ approved_for_initiation: approved }).eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/products')
}

// ── Creator Elite Settings ─────────────────────────────────────────────────────

export async function updateCreatorEliteSettings(
  id: string,
  data: {
    whatsapp_number?: string | null
    mastermind_date?: string | null
    account_manager_name?: string | null
    account_manager_whatsapp?: string | null
  }
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('creators').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return {}
}

// ── Strategy ──────────────────────────────────────────────────────────────────

export interface VideoInput {
  video_url: string
  thumbnail_url: string
}

export interface StrategyProductInput {
  product_id: string
  priority: string
  videos_per_day: number | null
  live_hours_per_week: number | null
  gmv_target: number | null
  strategy_note: string
  hashtags: string[]
  is_retainer: boolean
  campaign_id: string | null
  videos: VideoInput[]
}

export async function saveStrategy(data: {
  creator_id: string
  month: string
  products: StrategyProductInput[]
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { data: strategy, error: stratError } = await supabase
    .from('strategies')
    .upsert({ creator_id: data.creator_id, month: data.month }, { onConflict: 'creator_id,month' })
    .select('id')
    .single()

  if (stratError) return { error: stratError.message }

  await supabase.from('strategy_products').delete().eq('strategy_id', strategy.id)

  for (const p of data.products) {
    const { data: sp, error: spError } = await supabase
      .from('strategy_products')
      .insert({
        strategy_id: strategy.id,
        product_id: p.product_id || null,
        priority: p.priority,
        videos_per_day: p.videos_per_day,
        live_hours_per_week: p.live_hours_per_week,
        gmv_target: p.gmv_target,
        strategy_note: p.strategy_note,
        hashtags: p.hashtags,
        is_retainer: p.is_retainer,
        campaign_id: p.campaign_id || null,
      })
      .select('id')
      .single()

    if (spError) return { error: spError.message }

    if (p.videos.length > 0) {
      const videos = p.videos
        .filter((v) => v.video_url.trim())
        .map((v) => ({
          strategy_product_id: sp.id,
          video_url: v.video_url,
          thumbnail_url: v.thumbnail_url || null,
        }))
      if (videos.length > 0) {
        const { error: vError } = await supabase.from('strategy_videos').insert(videos)
        if (vError) return { error: vError.message }
      }
    }
  }

  revalidatePath('/admin')
  revalidatePath('/strategy')
  return {}
}

export async function getStrategyForAdmin(
  creatorId: string,
  month: string
): Promise<{ data?: { id: string; products: Record<string, unknown>[] } | null; error?: string }> {
  const supabase = createAdminClient()

  const { data: strategy, error } = await supabase
    .from('strategies')
    .select('id')
    .eq('creator_id', creatorId)
    .eq('month', month)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!strategy) return { data: null }

  const { data: products, error: pError } = await supabase
    .from('strategy_products')
    .select('*, videos:strategy_videos(*)')
    .eq('strategy_id', strategy.id)
    .order('created_at')

  if (pError) return { error: pError.message }

  return { data: { id: strategy.id, products: products ?? [] } }
}
