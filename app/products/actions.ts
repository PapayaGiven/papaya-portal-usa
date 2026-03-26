'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveInitiationProducts(
  creatorId: string,
  productIds: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in.' }

  // Verify the creatorId belongs to this user
  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('id', creatorId)
    .eq('email', user.email!)
    .single()

  if (!creator) return { error: 'Creator not found.' }

  // Delete existing selections and re-insert
  await supabase
    .from('creator_initiation_products')
    .delete()
    .eq('creator_id', creatorId)

  const inserts = productIds.map((pid) => ({
    creator_id: creatorId,
    product_id: pid,
  }))

  const { error } = await supabase
    .from('creator_initiation_products')
    .insert(inserts)

  if (error) return { error: error.message }

  revalidatePath('/products')
  return {}
}
