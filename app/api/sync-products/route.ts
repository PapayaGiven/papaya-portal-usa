import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()

  // Get sheet URL from settings
  const { data: settings } = await supabase.from('settings').select('google_sheets_url').limit(1).single()
  const sheetUrl = settings?.google_sheets_url?.replace(/^=+/, '').trim()
  if (!sheetUrl) return NextResponse.json({ error: 'No Google Sheets URL configured' }, { status: 400 })

  try {
    const res = await fetch(sheetUrl, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 500 })
    const text = await res.text()

    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) return NextResponse.json({ error: 'Sheet is empty' }, { status: 400 })

    // Parse CSV
    const parseCSV = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; continue }
        if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
        current += ch
      }
      result.push(current.trim())
      return result
    }

    const headers = parseCSV(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
    const rows = lines.slice(1).map(line => {
      const values = parseCSV(line)
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] ?? '' })
      return row
    })

    let count = 0
    for (const row of rows) {
      if (!row.name) continue
      const product: Record<string, unknown> = {
        name: row.name,
        commission_rate: parseFloat(row.commission_rate) || 0,
        niche: row.niche || null,
        showcase_link: row.showcase_link || null,
        sample_link: row.sample_link || null,
        is_exclusive: row.is_exclusive?.toLowerCase() === 'true',
      }

      // Check if product exists by name
      const { data: existing } = await supabase.from('products').select('id').eq('name', row.name).single()
      if (existing) {
        await supabase.from('products').update(product).eq('id', existing.id)
      } else {
        await supabase.from('products').insert(product)
      }
      count++
    }

    // Update last_synced_at
    const { data: settingsRow } = await supabase.from('settings').select('id').limit(1).single()
    if (settingsRow) {
      await supabase.from('settings').update({ last_synced_at: new Date().toISOString() }).eq('id', settingsRow.id)
    }

    return NextResponse.json({ success: true, count })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
