import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseClient'

// This is a dynamic route, so we don't want to cache it.
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('checkins')
      .select('court_id')
      .gte('expires_at', new Date().toISOString())

    if (error) {
      throw error
    }

    // Get unique court_ids
    const activeCourtIds = [...new Set(data.map(c => c.court_id))]

    return NextResponse.json(activeCourtIds)
  } catch (e) {
    console.error('Error fetching active check-ins:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
