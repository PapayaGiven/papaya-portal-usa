'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function toggleChecklistItem(
  creatorId: string,
  strategyProductId: string,
  field: 'video_posted' | 'live_done',
  value: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('daily_checklist')
    .upsert(
      {
        creator_id: creatorId,
        strategy_product_id: strategyProductId,
        date: today,
        [field]: value,
      },
      { onConflict: 'creator_id,strategy_product_id,date' }
    )

  if (error) return { error: error.message }
  revalidatePath('/strategy')
  return {}
}

export async function logVideoPostedToday(input: {
  productId: string | null
  strategyProductId: string
  tiktokUrl: string
  sparkCode?: string | null
  videoNotes?: string | null
  /**
   * Optional YYYY-MM-DD. When set, the video row is stamped with that
   * date (noon UTC) instead of now() so the weekly log groups it under
   * the correct day. Future dates are rejected. Defaults to today.
   */
  forDate?: string | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('email', user.email!)
    .maybeSingle()
  if (!creator) return { error: 'Creator not found' }

  const tiktok = input.tiktokUrl.trim()
  if (!tiktok) return { error: 'TikTok URL required' }

  let createdAtIso: string | null = null
  let dateKey: string
  const todayKey = new Date().toISOString().split('T')[0]
  if (input.forDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.forDate)) return { error: 'Invalid date' }
    if (input.forDate > todayKey) return { error: 'No puedes marcar videos en el futuro' }
    if (input.forDate < todayKey) createdAtIso = `${input.forDate}T12:00:00Z`
    dateKey = input.forDate
  } else {
    dateKey = todayKey
  }

  // Use admin client for the insert — creator_videos has only a read
  // policy for self, and creating a permissive insert RLS would be
  // wider than necessary. Auth is already verified above.
  const admin = createAdminClient()
  const insertRow: Record<string, unknown> = {
    creator_id: creator.id,
    product_id: input.productId,
    tiktok_url: tiktok,
    spark_code: input.sparkCode?.trim() || null,
    video_notes: input.videoNotes?.trim() || null,
  }
  if (createdAtIso) insertRow.created_at = createdAtIso

  const { error } = await admin.from('creator_videos').insert(insertRow)
  if (error) return { error: error.message }

  // Keep daily_checklist in sync for the targeted day so the legacy
  // /strategy daily checklist UI also reflects the log.
  await admin
    .from('daily_checklist')
    .upsert(
      {
        creator_id: creator.id,
        strategy_product_id: input.strategyProductId,
        date: dateKey,
        video_posted: true,
      },
      { onConflict: 'creator_id,strategy_product_id,date' },
    )

  revalidatePath('/dashboard')
  revalidatePath('/strategy')
  return {}
}

export interface VideoLogRow {
  id: string
  product_id: string | null
  tiktok_url: string
  spark_code: string | null
  video_notes: string | null
  created_at: string
}

export async function getVideoLogsForRange(input: {
  start: string
  endExclusive: string
}): Promise<{ rows?: VideoLogRow[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('email', user.email!)
    .maybeSingle()
  if (!creator) return { error: 'Creator not found' }

  const { data, error } = await supabase
    .from('creator_videos')
    .select('id, product_id, tiktok_url, spark_code, video_notes, created_at')
    .eq('creator_id', creator.id)
    .gte('created_at', input.start)
    .lt('created_at', input.endExclusive)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  return { rows: (data ?? []) as VideoLogRow[] }
}

export async function toggleCalendarDay(
  creatorId: string,
  date: string,
  completed: boolean,
  videosDone?: number
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const upsertData: Record<string, unknown> = {
    creator_id: creatorId,
    strategy_product_id: '00000000-0000-0000-0000-000000000000',
    date,
    video_posted: completed,
    live_done: false,
  }
  if (videosDone !== undefined) {
    upsertData.videos_done = videosDone
  }

  const { error } = await supabase
    .from('daily_checklist')
    .upsert(upsertData, { onConflict: 'creator_id,strategy_product_id,date' })

  if (error) return { error: error.message }
  revalidatePath('/strategy')
  return {}
}
