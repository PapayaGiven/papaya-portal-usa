'use server'

import { createClient } from '@/lib/supabase/server'
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

  const { error } = await supabase.from('creator_videos').insert({
    creator_id: creator.id,
    product_id: input.productId,
    tiktok_url: tiktok,
    spark_code: input.sparkCode?.trim() || null,
    video_notes: input.videoNotes?.trim() || null,
  })
  if (error) return { error: error.message }

  // Mark today's checklist row as posted for this strategy product so the
  // existing /strategy weekly view stays in sync.
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('daily_checklist')
    .upsert(
      {
        creator_id: creator.id,
        strategy_product_id: input.strategyProductId,
        date: today,
        video_posted: true,
      },
      { onConflict: 'creator_id,strategy_product_id,date' },
    )

  revalidatePath('/dashboard')
  revalidatePath('/strategy')
  return {}
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
