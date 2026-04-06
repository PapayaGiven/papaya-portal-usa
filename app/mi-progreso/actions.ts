'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function claimReward(rewardId: string, shippingData?: { shipping_name: string; shipping_phone: string; shipping_address: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: creator } = await supabase.from('creators').select('id').eq('email', user.email!).single()
  if (!creator) return { error: 'Creator not found' }

  const { error } = await supabase.from('creator_rewards').insert({
    creator_id: creator.id,
    reward_id: rewardId,
    claimed_at: new Date().toISOString(),
    ...shippingData,
  })

  if (error) return { error: error.message }
  revalidatePath('/mi-progreso')
  return {}
}
