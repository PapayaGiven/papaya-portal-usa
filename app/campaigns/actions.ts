'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitCampaignApplication(data: {
  campaign_id: string
  posts_offered: number
  live_hours_offered: number
  price_offered: number
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in.' }

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('email', user.email!)
    .single()

  if (!creator) return { error: 'Creator profile not found.' }

  const { error } = await supabase.from('campaign_applications').insert({
    campaign_id: data.campaign_id,
    creator_id: creator.id,
    posts_offered: data.posts_offered,
    live_hours_offered: data.live_hours_offered,
    price_offered: data.price_offered,
  })

  if (error) return { error: error.message }
  return {}
}
