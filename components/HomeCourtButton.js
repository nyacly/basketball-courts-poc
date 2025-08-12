'use client'
import { useState } from 'react'
import { useSession } from '@/components/AuthWrapper'
import { createClient } from '@/lib/supabaseClient'

const supabase = createClient()

export default function HomeCourtButton({ court }) {
  const { session, profile, loading: sessionLoading } = useSession()
  const [loading, setLoading] = useState(false)

  const handleSetHomeCourt = async () => {
    if (!session) return
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ home_court_id: court.id })
      .eq('id', session.user.id)

    if (error) {
      alert(error.message)
    }
    // Note: The profile data in useSession will re-validate automatically,
    // but it might not be instantaneous. A manual refetch could be forced if needed.
    setLoading(false)
  }

  if (sessionLoading || !session) {
    return null // Don't show anything if not logged in or session is loading
  }

  const isHomeCourt = profile?.home_court_id === court.id

  if (isHomeCourt) {
    return <div className="kicker">★ Your Home Court</div>
  }

  return (
    <button onClick={handleSetHomeCourt} disabled={loading} className="btn secondary" style={{ width: '100%' }}>
      {loading ? '...' : 'Set as Home Court'}
    </button>
  )
}
