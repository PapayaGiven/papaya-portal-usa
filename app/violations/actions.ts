'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitViolation(description: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: creator } = await supabase.from('creators').select('id').eq('email', user.email!).single()
  if (!creator) return { error: 'Creator not found' }

  const { error } = await supabase.from('violations').insert({
    creator_id: creator.id,
    description,
  })

  if (error) return { error: error.message }
  revalidatePath('/violations')
  return {}
}
