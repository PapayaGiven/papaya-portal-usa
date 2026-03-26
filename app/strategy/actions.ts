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
