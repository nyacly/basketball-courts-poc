'use client'
import { useState } from 'react'
import { useSession } from '@/components/AuthWrapper'
import { supabase } from '@/components/supabase'

export default function HomeCourtButton({ court, homeCourtCount }) {
  const { session, profile, loading: sessionLoading } = useSession()
  const [loading, setLoading] = useState(false)

  const handleSetHomeCourt = async () => {
    if (!session) return
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ home_court_id: court.id })
      .eq('id', session.user.id)

    if (error) alert(error.message)
    setLoading(false)
  }

  const handleUnsetHomeCourt = async () => {
    if (!session) return
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ home_court_id: null })
      .eq('id', session.user.id)

    if (error) alert(error.message)
    setLoading(false)
  }

  if (sessionLoading || !session) {
    return null // Don't show anything if not logged in or session is loading
  }

  const isHomeCourt = profile?.home_court_id === court.id

  return (
    <div>
      {isHomeCourt ? (
        <button onClick={handleUnsetHomeCourt} disabled={loading} className="btn danger" style={{ width: '100%' }}>
          {loading ? '...' : '★ Un-set as Home Court'}
        </button>
      ) : (
        <button onClick={handleSetHomeCourt} disabled={loading} className="btn secondary" style={{ width: '100%' }}>
          {loading ? '...' : 'Set as Home Court'}
        </button>
      )}
      <p className="kicker" style={{ textAlign: 'center', marginTop: 8 }}>
        Community: {homeCourtCount} player{homeCourtCount === 1 ? '' : 's'} call this home.
      </p>
    </div>
  )
}
