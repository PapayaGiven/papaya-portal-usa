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
  if (gmv >= 10000) newLevel = 'Elite'
  else if (gmv >= 5000) newLevel = 'Scale'
  else if (gmv >= 1000) newLevel = 'Growth'
  else if (gmv >= 300) newLevel = 'Foundation'

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
  target_levels: string[]
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

export async function updateCampaign(
  id: string,
  data: Partial<{
    brand_name: string
    description: string
    commission_rate: number
    spots_left: number
    deadline: string
    min_level: CreatorLevel
    target_levels: string[]
    status: string
    brand_logo_url: string | null
    product_id: string | null
    budget: number | null
    product_link: string | null
    sample_available: boolean
  }>
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('campaigns').update(data).eq('id', id)
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

// ── Levels ───────────────────────────────────────────────────────────────────

export async function updateLevel(id: string, data: {
  name?: string; gmv_min?: number; gmv_max?: number | null;
  description?: string; includes?: string[]; excludes?: string[]
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('levels').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

export async function seedDefaultLevels(): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const defaults = [
    { name: 'Initiation', order_index: 1, gmv_min: 0, gmv_max: 299, description: 'El punto de partida. Aquí demuestras tu disciplina.', includes: ['3 productos seleccionados', 'Checklist diario', 'Soporte grupal WhatsApp', 'Acceso a educación Kajabi'], excludes: ['Campañas de marcas', 'Leaderboard', 'Estrategia completa', 'Soporte 1:1'] },
    { name: 'Foundation', order_index: 2, gmv_min: 300, gmv_max: 999, description: 'Ya sabes que funciona. Ahora construye consistencia.', includes: ['Catálogo completo de productos', 'Videos virales', 'Campañas disponibles', 'Leaderboard completo', 'Estrategia básica', 'Comunidad WhatsApp'], excludes: ['Estrategia con hashtags', 'Soporte 1:1', 'Pitch a marcas'] },
    { name: 'Growth', order_index: 3, gmv_min: 1000, gmv_max: 4999, description: 'Aquí empieza el apalancamiento real.', includes: ['Todo de Foundation', 'Estrategia completa con hashtags y videos ejemplo', 'Aplicación a campañas de marcas', 'Productos exclusivos', 'Contacto con account manager'], excludes: ['Soporte 1:1 semanal', 'Retainers garantizados'] },
    { name: 'Scale', order_index: 4, gmv_min: 5000, gmv_max: 9999, description: 'Estás escalando. Es momento de maximizar.', includes: ['Todo de Growth', 'Soporte 1:1 mensual', 'Acceso prioritario a campañas', 'Lista de productos curada'], excludes: ['Soporte 1:1 semanal', 'Mínimo 3 retainers activos'] },
    { name: 'Elite', order_index: 5, gmv_min: 10000, gmv_max: null, description: 'El nivel más alto. Papaya trabaja para ti.', includes: ['Todo de Scale', 'Soporte 1:1 semanal', 'Account manager personal', 'Mínimo 3 retainers activos', 'Mastermind mensual', 'Evento físico trimestral', 'WhatsApp directo con tu manager'], excludes: [] },
  ]

  // Delete existing and re-insert
  await supabase.from('levels').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { error } = await supabase.from('levels').insert(defaults)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

// ── Rewards ──────────────────────────────────────────────────────────────────

export async function addReward(data: {
  level_name: string; title: string; description?: string; emoji?: string;
  cta_text?: string; cta_type?: string; cta_url?: string;
  requires_address?: boolean; order_index?: number; is_active?: boolean
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('rewards').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

export async function updateReward(id: string, data: Partial<{
  level_name: string; title: string; description: string; emoji: string;
  cta_text: string; cta_type: string; cta_url: string;
  requires_address: boolean; order_index: number; is_active: boolean
}>): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('rewards').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

export async function deleteReward(id: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('rewards').delete().eq('id', id)
  revalidatePath('/admin')
}

export async function confirmRewardReceived(creatorRewardId: string, confirmed: boolean): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('creator_rewards').update({
    admin_confirmed: confirmed,
    received_at: confirmed ? new Date().toISOString() : null,
  }).eq('id', creatorRewardId)
  revalidatePath('/admin')
}

// ── Creator Elite Settings ─────────────────────────────────────────────────────

export async function updateCreatorEliteSettings(
  id: string,
  data: {
    whatsapp_number?: string | null
    mastermind_date?: string | null
    account_manager_name?: string | null
    account_manager_whatsapp?: string | null
    booking_link?: string | null
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
  brief_url: string | null
  video_focus: string
  quick_checklist: string[]
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
        brief_url: p.brief_url || null,
        video_focus: p.video_focus || null,
        quick_checklist: p.quick_checklist ?? [],
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

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Record<string, unknown> | null> {
  const supabase = createAdminClient()
  const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle()
  return data
}

export async function updateSettings(data: {
  calls_per_month_initiation?: number
  calls_per_month_foundation?: number
  calls_per_month_growth?: number
  calls_per_month_scale?: number
  calls_per_month_elite?: number
  booking_link_growth?: string | null
  booking_link_scale?: string | null
  booking_link_elite?: string | null
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { data: existing } = await supabase.from('settings').select('id').limit(1).maybeSingle()

  if (existing) {
    const { error } = await supabase.from('settings').update(data).eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('settings').insert(data)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return {}
}
