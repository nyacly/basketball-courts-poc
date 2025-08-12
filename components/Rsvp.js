'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/components/AuthWrapper'
import { format } from 'date-fns'

export default function Rsvp({ court, rsvps }) {
  const { session } = useSession()
  const [loading, setLoading] = useState(false)
  const [userRsvpCount, setUserRsvpCount] = useState(0)
  const [slotRsvpCount, setSlotRsvpCount] = useState(0)
  const [date, setDate] = useState(new Date())
  const [time, setTime] = useState(`${new Date().getHours() + 1}:00`)

  useEffect(() => {
    const [hour, minute] = time.split(':').map(Number)
    const selected_starts_at = new Date(date)
    selected_starts_at.setHours(hour, minute, 0, 0)

    const count = rsvps.filter(
      (rsvp) => new Date(rsvp.starts_at).getTime() === selected_starts_at.getTime()
    ).length
    setSlotRsvpCount(count)
  }, [rsvps, date, time])

  useEffect(() => {
    if (!session) return
    const fetchUserRsvpCount = async () => {
      const { count, error } = await supabase
        .from('rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .gte('ends_at', new Date().toISOString())

      if (error) {
        console.error('Error fetching user RSVP count:', error)
      } else {
        setUserRsvpCount(count)
      }
    }
    fetchUserRsvpCount()
  }, [session, rsvps]) // Depend on rsvps to refetch when user adds/cancels

  const handleRsvp = async (e) => {
    e.preventDefault()
    if (!session) {
      alert('You must be logged in to RSVP.')
      return
    }
    setLoading(true)

    const [hour, minute] = time.split(':').map(Number)
    const starts_at = new Date(date)
    starts_at.setHours(hour, minute, 0, 0)

    const ends_at = new Date(starts_at)
    ends_at.setMinutes(starts_at.getMinutes() + 30)

    try {
      const { error } = await supabase.from('rsvps').insert({
        user_id: session.user.id,
        court_id: court.id,
        court_name: court.title,
        court_lga: court.lga,
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
      })
      if (error) throw error
      alert('RSVP successful!')
    } catch (error) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUnRsvp = async (rsvpId) => {
    if (!window.confirm('Are you sure you want to cancel this RSVP?')) return

    const { error } = await supabase.from('rsvps').delete().match({ id: rsvpId })

    if (error) {
      alert(error.message)
    }
  }

  if (!court) return null

  return (
    <div className="rsvp-container">
      <h4>Coming up</h4>
      {rsvps.length > 0 ? (
        <ul className="list">
          {rsvps.map((rsvp) => (
            <li key={rsvp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{rsvp.display_name || 'Anonymous'}</strong>
                <span className="kicker" style={{ marginLeft: 8 }}>
                  {format(new Date(rsvp.starts_at), 'p')} on {format(new Date(rsvp.starts_at), 'MMM d')}
                </span>
              </div>
              {session?.user?.id === rsvp.user_id && (
                <button onClick={() => handleUnRsvp(rsvp.id)} className="btn secondary" style={{ padding: '4px 8px', fontSize: 12 }}>
                  Cancel
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No upcoming RSVPs.</p>
      )}

      {session && (
        userRsvpCount >= 2 ? (
          <p className="kicker" style={{ textAlign: 'center', marginTop: 16 }}>
            You have reached your maximum of 2 active bookings.
          </p>
        ) : (
          <form onSubmit={handleRsvp} className="rsvp-form">
            <h5>RSVP for a slot ({slotRsvpCount} / 20 booked)</h5>
            <input
              type="date"
              value={format(date, 'yyyy-MM-dd')}
              onChange={(e) => setDate(new Date(e.target.value))}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="input"
            />
            <select value={time} onChange={(e) => setTime(e.target.value)} className="input">
              {Array.from({ length: 48 }, (_, i) => {
                const hour = Math.floor(i / 2)
                const minute = i % 2 === 0 ? '00' : '30'
                const nextHour = minute === '30' ? hour + 1 : hour
                const nextMinute = minute === '30' ? '00' : '30'
                const displayTime = `${hour}:${minute}`
                const displayEndTime = `${nextHour}:${nextMinute}`
                return (
                  <option key={displayTime} value={displayTime}>
                    {`${displayTime} - ${displayEndTime}`}
                  </option>
                )
              })}
            </select>
            <button type="submit" disabled={loading || slotRsvpCount >= 20} className="btn">
              {slotRsvpCount >= 20 ? 'Slot is full' : (loading ? '...' : 'RSVP')}
            </button>
          </form>
        )
      )}
    </div>
  )
}
