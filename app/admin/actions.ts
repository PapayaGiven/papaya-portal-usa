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
  if (gmv >= 150000) newLevel = 'Elite'
  else if (gmv >= 30000) newLevel = 'Scale'
  else if (gmv >= 5000) newLevel = 'Growth'
  else if (gmv >= 500) newLevel = 'Foundation'

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

function generateAccessCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const rand = (set: string, n: number) => Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join('')
  return `${rand(letters, 3)}-${rand('0123456789', 3)}-${rand(letters, 3)}`
}

async function generateUniqueAccessCode(): Promise<string> {
  const supabase = createAdminClient()
  for (let i = 0; i < 10; i++) {
    const code = generateAccessCode()
    const { data } = await supabase.from('creators').select('id').eq('access_code', code).maybeSingle()
    if (!data) return code
  }
  return generateAccessCode()
}

export async function addCreator(name: string, email: string): Promise<{ error?: string; access_code?: string }> {
  const supabase = createAdminClient()

  const access_code = await generateUniqueAccessCode()
  const normalizedEmail = email.trim().toLowerCase()

  const { error: dbError } = await supabase.from('creators').insert({ name, email: normalizedEmail, access_code })
  if (dbError) return { error: dbError.message }

  revalidatePath('/admin')
  return { access_code }
}

export async function regenerateAccessCode(id: string): Promise<{ error?: string; access_code?: string }> {
  const supabase = createAdminClient()
  const access_code = await generateUniqueAccessCode()
  const { error } = await supabase.from('creators').update({ access_code }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { access_code }
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export async function verifyAccessCode(code: string): Promise<{ error?: string; name?: string; email?: string }> {
  const supabase = createAdminClient()
  const cleaned = code.trim().toUpperCase()
  const { data, error } = await supabase
    .from('creators')
    .select('name, email, has_completed_onboarding')
    .eq('access_code', cleaned)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'invalid' }
  if (data.has_completed_onboarding) return { error: 'already_completed' }
  return { name: data.name ?? '', email: data.email ?? '' }
}

export async function completeOnboarding(data: {
  access_code: string
  email: string
  password: string
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const cleaned = data.access_code.trim().toUpperCase()

  const { data: creator, error: fetchErr } = await supabase
    .from('creators')
    .select('id, email, has_completed_onboarding')
    .eq('access_code', cleaned)
    .maybeSingle()

  if (fetchErr) return { error: fetchErr.message }
  if (!creator) return { error: 'Código no válido.' }
  if (creator.has_completed_onboarding) return { error: 'Esta cuenta ya fue creada. Inicia sesión.' }

  const email = data.email.trim().toLowerCase()

  const { data: { users } } = await supabase.auth.admin.listUsers()
  const existingAuth = users.find((u) => u.email === email)

  if (existingAuth) {
    const { error: updateErr } = await supabase.auth.admin.updateUserById(existingAuth.id, {
      password: data.password,
      email_confirm: true,
    })
    if (updateErr) return { error: updateErr.message }
  } else {
    const { error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    })
    if (createErr) return { error: createErr.message }
  }

  const { error: updErr } = await supabase
    .from('creators')
    .update({ email, has_completed_onboarding: true })
    .eq('id', creator.id)

  if (updErr) return { error: updErr.message }

  revalidatePath('/admin')
  return {}
}

export async function resetPasswordWithAccessCode(
  code: string,
  newPassword: string,
): Promise<{ error?: string }> {
  if (!newPassword || newPassword.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  const supabase = createAdminClient()
  const cleaned = code.trim().toUpperCase()

  const { data: creator, error: fetchErr } = await supabase
    .from('creators')
    .select('email, has_completed_onboarding')
    .eq('access_code', cleaned)
    .maybeSingle()

  if (fetchErr) return { error: fetchErr.message }
  if (!creator) return { error: 'Código no válido. Contacta a tu account manager.' }
  if (!creator.email) return { error: 'No hay email asociado a este código. Contacta a tu account manager.' }
  if (!creator.has_completed_onboarding) {
    return { error: 'Esta cuenta aún no se ha creado. Usa "Primera vez aquí" en el inicio de sesión.' }
  }

  const normalizedEmail = creator.email.trim().toLowerCase()
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) return { error: listErr.message }

  const authUser = users.find((u) => u.email?.toLowerCase() === normalizedEmail)
  if (!authUser) return { error: 'No encontramos tu cuenta de acceso. Contacta a tu account manager.' }

  const { error: updateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
    password: newPassword,
  })
  if (updateErr) return { error: updateErr.message }

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
  showcase_link?: string | null
  sample_link?: string | null
  tags: string[]
  star_rating?: number | null
  review_count?: number | null
  units_sold?: number | null
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
    showcase_link: string | null
    sample_link: string | null
    tags: string[]
    star_rating: number | null
    review_count: number | null
    units_sold: number | null
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

async function syncCampaignProducts(campaignId: string, productIds: string[]) {
  const supabase = createAdminClient()
  await supabase.from('campaign_products').delete().eq('campaign_id', campaignId)
  if (productIds.length > 0) {
    const rows = productIds.map((product_id) => ({ campaign_id: campaignId, product_id }))
    await supabase.from('campaign_products').insert(rows)
  }
}

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
  product_ids?: string[]
  budget: number | null
  product_link: string | null
  sample_available: boolean
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { product_ids, ...insertData } = data
  const { data: inserted, error } = await supabase.from('campaigns').insert(insertData).select('id').single()
  if (error) return { error: error.message }
  if (inserted && product_ids) {
    await syncCampaignProducts(inserted.id, product_ids)
  }
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
    product_ids: string[]
    budget: number | null
    product_link: string | null
    sample_available: boolean
  }>
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { product_ids, ...updateData } = data
  const { error } = await supabase.from('campaigns').update(updateData).eq('id', id)
  if (error) return { error: error.message }
  if (product_ids !== undefined) {
    await syncCampaignProducts(id, product_ids)
  }
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

export async function updateCreatorVideosOverride(id: string, videosPerDay: number | null): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('creators').update({ custom_videos_per_day: videosPerDay }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return {}
}

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
  is_external?: boolean
  external_product_name?: string
  external_brand?: string
  external_commission?: string | number | null
  external_link?: string
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
    const isExternal = !!p.is_external
    const externalName = (p.external_product_name ?? '').trim()

    if (!isExternal && !p.product_id) continue
    if (isExternal && !externalName) continue

    const externalCommission =
      p.external_commission == null || p.external_commission === ''
        ? null
        : typeof p.external_commission === 'number'
          ? p.external_commission
          : Number(p.external_commission)

    const { data: sp, error: spError } = await supabase
      .from('strategy_products')
      .insert({
        strategy_id: strategy.id,
        product_id: isExternal ? null : (p.product_id || null),
        priority: p.priority,
        videos_per_day: p.videos_per_day,
        live_hours_per_week: p.live_hours_per_week,
        gmv_target: p.gmv_target,
        strategy_note: p.strategy_note,
        hashtags: p.hashtags,
        is_retainer: p.is_retainer,
        campaign_id: isExternal ? null : (p.campaign_id || null),
        brief_url: p.brief_url || null,
        video_focus: p.video_focus || null,
        quick_checklist: p.quick_checklist ?? [],
        is_external: isExternal,
        external_product_name: isExternal ? externalName : null,
        external_brand: isExternal ? ((p.external_brand ?? '').trim() || null) : null,
        external_commission: isExternal && externalCommission !== null && !Number.isNaN(externalCommission) ? externalCommission : null,
        external_link: isExternal ? ((p.external_link ?? '').trim() || null) : null,
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
  booking_link_initiation?: string | null
  booking_link_foundation?: string | null
  booking_link_growth?: string | null
  booking_link_scale?: string | null
  booking_link_elite?: string | null
  google_sheets_url?: string | null
  last_synced_at?: string | null
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

// ── Level Config ─────────────────────────────────────────────────────────────

export async function updateLevelConfig(
  levelName: string,
  data: Partial<{
    videos_per_day: number
    hero_products: number
    hero_videos_each: number
    sub_hero_products: number
    sub_hero_videos_each: number
    complementary_videos: number
    winner_videos: number
    has_creative_bank: boolean
    has_deliverables_board: boolean
    has_brand_pipeline: boolean
    has_retainer: boolean
    calls_per_month: number
    call_frequency: string
    has_masterclass: boolean
    has_mastermind: boolean
  }>
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('level_config').update(data).eq('level_name', levelName)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/strategy')
  return {}
}

// ── Deliverables ─────────────────────────────────────────────────────────────

export async function addDeliverable(data: {
  creator_id: string
  brand_name: string
  deliverable_type: string
  due_date: string | null
  notes: string | null
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('deliverables').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/deliverables')
  return {}
}

export async function updateDeliverableStatus(id: string, status: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('deliverables').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/deliverables')
  return {}
}

export async function deleteDeliverable(id: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('deliverables').delete().eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/deliverables')
}

// ── Announcements ───────────────────────────────────────────────────────────

export async function addAnnouncement(data: {
  title: string
  body: string | null
  image_url: string | null
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('announcements').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return {}
}

export async function updateAnnouncement(id: string, data: {
  title?: string
  body?: string | null
  image_url?: string | null
  is_active?: boolean
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('announcements').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return {}
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('announcements').delete().eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/dashboard')
}

export async function uploadAnnouncementImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  const supabase = createAdminClient()
  const ext = file.name.split('.').pop()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('announcement-images')
    .upload(path, file, { contentType: file.type })

  if (error) return { error: error.message }

  const { data: urlData } = supabase.storage
    .from('announcement-images')
    .getPublicUrl(path)

  return { url: urlData.publicUrl }
}

// ── Strategy Products Creative Bank ──────────────────────────────────────────

export async function updateStrategyProductCreative(
  id: string,
  data: { hooks?: string[]; scripts?: string | null; trends?: string | null }
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('strategy_products').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/strategy')
  return {}
}

// ── Creator-centric admin (Crecimiento / Calls / Videos) ─────────────────────

export async function updateCreatorContact(
  id: string,
  data: { name?: string | null; email?: string | null; phone_number?: string | null },
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const payload: Record<string, string | null> = {}
  if (data.name !== undefined) payload.name = data.name?.trim() || null
  if (data.email !== undefined) payload.email = data.email ? data.email.trim().toLowerCase() : null
  if (data.phone_number !== undefined) payload.phone_number = data.phone_number?.trim() || null
  const { error } = await supabase.from('creators').update(payload).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return {}
}

export async function upsertCreatorMonthlyStats(data: {
  creator_id: string
  month: string
  gmv?: number
  gmv_projection?: number
  commission_rate?: number
  videos_posted?: number
  live_hours?: number
  commissions_earned?: number
  notes?: string | null
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('creator_monthly_stats')
    .upsert(
      {
        creator_id: data.creator_id,
        month: data.month,
        gmv: data.gmv ?? 0,
        gmv_projection: data.gmv_projection ?? 0,
        commission_rate: data.commission_rate ?? 0,
        videos_posted: data.videos_posted ?? 0,
        live_hours: data.live_hours ?? 0,
        commissions_earned: data.commissions_earned ?? 0,
        notes: data.notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'creator_id,month' },
    )
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/mi-crecimiento')
  return {}
}

export async function deleteCreatorMonthlyStats(id: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('creator_monthly_stats').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/mi-crecimiento')
  return {}
}

export async function addCreatorVideo(data: {
  creator_id: string
  product_id?: string | null
  tiktok_url: string
  converted?: boolean
  gmv_generated?: number
  notes?: string | null
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('creator_videos').insert({
    creator_id: data.creator_id,
    product_id: data.product_id || null,
    tiktok_url: data.tiktok_url.trim(),
    converted: data.converted ?? false,
    gmv_generated: data.gmv_generated ?? 0,
    notes: data.notes ?? null,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/mi-crecimiento')
  return {}
}

export async function updateCreatorVideo(
  id: string,
  data: Partial<{ converted: boolean; gmv_generated: number; product_id: string | null; tiktok_url: string; notes: string | null }>,
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('creator_videos').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/mi-crecimiento')
  return {}
}

export async function deleteCreatorVideo(id: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('creator_videos').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/mi-crecimiento')
  return {}
}

export async function addCallNote(data: {
  creator_id: string
  note: string
  call_date?: string
}): Promise<{ error?: string }> {
  const trimmed = data.note.trim()
  if (!trimmed) return { error: 'La nota no puede estar vacía.' }
  const supabase = createAdminClient()
  const { error } = await supabase.from('call_notes').insert({
    creator_id: data.creator_id,
    note: trimmed,
    call_date: data.call_date ?? new Date().toISOString().split('T')[0],
  })
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

export async function deleteCallNote(id: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('call_notes').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

// ── Papaya Picks ──────────────────────────────────────────────────────────────

export interface PapayaPickInput {
  product_name: string
  brand_name?: string | null
  niche?: string | null
  commission_rate?: number | null
  product_link?: string | null
  sample_link?: string | null
  product_image_url?: string | null
  units_sold_this_week?: number
  growth_percentage?: number
  affiliates_count?: number
  videos_count?: number
  why_its_a_pick?: string | null
  example_video_url?: string | null
  min_level?: string
  is_active?: boolean
  expires_at?: string | null
}

export async function addPapayaPick(data: PapayaPickInput): Promise<{ error?: string; id?: string }> {
  if (!data.product_name?.trim()) return { error: 'Nombre del producto requerido.' }
  const supabase = createAdminClient()
  const { data: row, error } = await supabase.from('papaya_picks').insert({
    ...data,
    product_name: data.product_name.trim(),
  }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/papaya-picks')
  return { id: row?.id }
}

export async function updatePapayaPick(id: string, data: Partial<PapayaPickInput>): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('papaya_picks').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/papaya-picks')
  return {}
}

export async function deletePapayaPick(id: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('papaya_picks').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/papaya-picks')
  return {}
}

export async function togglePapayaPick(id: string, isActive: boolean): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('papaya_picks').update({ is_active: isActive }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/papaya-picks')
  return {}
}

export async function getCreatorAdminBundle(creatorId: string): Promise<{
  monthlyStats?: Record<string, unknown>[]
  videos?: Record<string, unknown>[]
  callNotes?: Record<string, unknown>[]
  deliverables?: Record<string, unknown>[]
  error?: string
}> {
  const supabase = createAdminClient()
  const [stats, videos, notes, deliverables] = await Promise.all([
    supabase.from('creator_monthly_stats').select('*').eq('creator_id', creatorId).order('month', { ascending: false }),
    supabase.from('creator_videos').select('*, product:products(id, name)').eq('creator_id', creatorId).order('created_at', { ascending: false }),
    supabase.from('call_notes').select('*').eq('creator_id', creatorId).order('call_date', { ascending: false }),
    supabase.from('deliverables').select('*').eq('creator_id', creatorId).order('due_date', { ascending: true, nullsFirst: false }),
  ])
  if (stats.error) return { error: stats.error.message }
  if (videos.error) return { error: videos.error.message }
  if (notes.error) return { error: notes.error.message }
  if (deliverables.error) return { error: deliverables.error.message }
  return {
    monthlyStats: stats.data ?? [],
    videos: videos.data ?? [],
    callNotes: notes.data ?? [],
    deliverables: deliverables.data ?? [],
  }
}
