import { NextResponse } from 'next/server'
import { supabase } from '@/components/supabase' // Using the new singleton client

export const dynamic = 'force-dynamic'

export async function GET(_req, { params }) {
  const { id: courtId } = params

  if (!courtId) {
    return NextResponse.json({ error: 'Court ID is required' }, { status: 400 })
  }

  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('home_court_id', courtId)

    if (error) {
      throw error
    }

    return NextResponse.json({ count: count ?? 0 })
  } catch (e) {
    console.error(`Error fetching home court count for court ${courtId}:`, e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
