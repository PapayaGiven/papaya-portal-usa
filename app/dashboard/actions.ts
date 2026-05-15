'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Mark a notification as read once the creator dismisses it on the
// dashboard banner. RLS on creator_notifications already gates writes
// to the owning creator, so the user-scoped client is fine here.
export async function markNotificationRead(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('creator_notifications').update({ is_read: true }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}

// Toggle a deliverable between pending and done from the creator side.
// Migration 015 added the matching RLS policy so this update succeeds
// for the creator who owns the row.
export async function setDeliverableStatus(id: string, status: 'pending' | 'done'): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('deliverables').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}

export async function submitProductRequest(data: {
  product_name: string
  brand_name: string
  reason: string
  contact_info?: string
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
    contact_info: data.contact_info || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}

export async function updatePersonalGoalNotes(notes: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('creators').update({ personal_goal_notes: notes }).eq('email', user.email!)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}
