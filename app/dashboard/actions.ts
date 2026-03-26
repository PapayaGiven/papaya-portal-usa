'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitProductRequest(data: {
  product_name: string
  brand_name: string
  reason: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('email', user.email!)
    .single()

  if (!creator) return { error: 'Creator profile not found.' }

  const { error } = await supabase.from('product_requests').insert({
    creator_id: creator.id,
    product_name: data.product_name,
    brand_name: data.brand_name,
    reason: data.reason || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}
