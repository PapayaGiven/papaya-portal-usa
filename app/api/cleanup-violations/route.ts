import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: oldViolations } = await supabase
    .from('violations')
    .select('id, screenshot_urls')
    .lt('created_at', thirtyDaysAgo.toISOString())

  if (!oldViolations || oldViolations.length === 0) {
    return NextResponse.json({ message: 'No old violations to clean up', count: 0 })
  }

  let cleaned = 0
  for (const v of oldViolations) {
    // Delete screenshots from storage
    const urls = v.screenshot_urls as string[] ?? []
    for (const url of urls) {
      const path = url.split('/violation-screenshots/').pop()
      if (path) {
        await supabase.storage.from('violation-screenshots').remove([path])
      }
    }
    // Clear screenshot URLs
    await supabase.from('violations').update({ screenshot_urls: [] }).eq('id', v.id)
    cleaned++
  }

  return NextResponse.json({ message: `Cleaned ${cleaned} violations`, count: cleaned })
}
