'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/components/supabase'
import { useSession } from '@/components/AuthWrapper'
import { formatDistanceToNow } from 'date-fns'
import { haversine } from '@/lib/haversine'
import { toast } from 'sonner'

// Check-ins expire after 90 minutes
const CHECKIN_EXPIRY_MINS = 90
// User must be within 20m of the court to check in
const CHECKIN_MAX_DIST_M = 20

export default function Checkin({ court, rsvps }) {
  const { session } = useSession()
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [canCheckIn, setCanCheckIn] = useState(false)

  useEffect(() => {
    if (!session || !rsvps || rsvps.length === 0) {
      setCanCheckIn(false)
      return
    }

    const now = new Date()
    const hasValidRsvp = rsvps.some(rsvp => {
      const starts = new Date(rsvp.starts_at)
      const ends = new Date(rsvp.ends_at)
      return rsvp.user_id === session.user.id && now >= starts && now <= ends
    })

    setCanCheckIn(hasValidRsvp)

  }, [rsvps, session])

  useEffect(() => {
    if (!court) return
    const fetchCheckins = async () => {
      const { data, error } = await supabase
        .from('v_checkins')
        .select('*')
        .eq('court_id', court.id)
        .gte('expires_at', new Date().toISOString())
        .order('checked_in_at', { ascending: false })

      if (error) {
        console.error('Error fetching check-ins:', error)
      } else {
        setCheckins(data)
      }
    }

    fetchCheckins()

    const channel = supabase
      .channel(`checkins:${court.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkins', filter: `court_id=eq.${court.id}` },
        (payload) => {
          fetchCheckins()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [court])

  const handleCheckin = async () => {
    if (!session) {
      toast.error('You must be logged in to check in.')
      return
    }
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation not available in this browser.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const dist = haversine(latitude, longitude, court.lat, court.lon)

        if (dist > CHECKIN_MAX_DIST_M) {
          setError(`You must be within ${CHECKIN_MAX_DIST_M}m of the court to check in. You are ~${Math.round(dist)}m away.`)
          setLoading(false)
          return
        }

        const expires_at = new Date()
        expires_at.setMinutes(expires_at.getMinutes() + CHECKIN_EXPIRY_MINS)

        try {
          const { error } = await supabase.from('checkins').insert({
            user_id: session.user.id,
            court_id: court.id,
            court_name: court.title,
            court_lga: court.lga,
            lat: latitude,
            lon: longitude,
            accuracy_m: accuracy,
            expires_at: expires_at.toISOString(),
          })
          if (error) throw error
          toast.success('Checked in')
        } catch (error) {
          setError(error.message)
          toast.error(error.message)
        } finally {
          setLoading(false)
        }
      },
      (err) => {
        setError(err.message)
        toast.error(err.message)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  if (!court) return null

  return (
    <div className="checkin-container">
      <h4>Happening now ({checkins.length})</h4>
      {checkins.length > 0 ? (
        <ul className="list">
          {checkins.map((checkin) => (
            <li key={checkin.id}>
              <strong>{checkin.display_name || 'Anonymous'}</strong> checked in{' '}
              {formatDistanceToNow(new Date(checkin.checked_in_at), { addSuffix: true })}
            </li>
          ))}
        </ul>
      ) : (
        <p className="kicker">No one is checked in right now.</p>
      )}

      {canCheckIn && (
        <div className="checkin-action" style={{ marginTop: 16 }}>
          <button onClick={handleCheckin} disabled={loading} className="btn">
            {loading ? 'Checking in...' : 'Check in here'}
          </button>
          {error && <p style={{ color: '#ff4d4d', fontSize: 12, marginTop: 8 }}>{error}</p>}
        </div>
      )}
    </div>
  )
}
