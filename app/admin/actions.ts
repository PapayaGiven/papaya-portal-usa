'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { CreatorLevel, LEVEL_CONFIG } from '@/lib/types'

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function adminLogin(password: string): Promise<{ error?: string }> {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Falsches Passwort.' }
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
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/dashboard`,
  })
  if (authError) return { error: `Creator erstellt, aber Einladung fehlgeschlagen: ${authError.message}` }

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

// ── Tasks ─────────────────────────────────────────────────────────────────────

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
    return { error: 'Keine aktiven Creator in diesem Level gefunden.' }

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
