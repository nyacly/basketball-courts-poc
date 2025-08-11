'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useSession } from '@/components/AuthWrapper'
import { format } from 'date-fns'

const supabase = createClient()

export default function Rsvp({ court }) {
  const { session } = useSession()
  const [rsvps, setRsvps] = useState([])
  const [loading, setLoading] = useState(false)
  const [isAlreadyBooked, setIsAlreadyBooked] = useState(false)
  const [date, setDate] = useState(new Date())
  const [time, setTime] = useState(`${new Date().getHours() + 1}:00`)

  useEffect(() => {
    if (!court || !session || !rsvps.length) {
      setIsAlreadyBooked(false)
      return
    }
    const [hour, minute] = time.split(':').map(Number)
    const selected_starts_at = new Date(date)
    selected_starts_at.setHours(hour, minute, 0, 0)

    const found = rsvps.some(
      (rsvp) =>
        rsvp.user_id === session.user.id &&
        new Date(rsvp.starts_at).getTime() === selected_starts_at.getTime()
    )
    setIsAlreadyBooked(found)
  }, [court, session, rsvps, date, time])

  useEffect(() => {
    if (!court) return
    const fetchRsvps = async () => {
      const { data, error } = await supabase
        .from('v_rsvps')
        .select('*')
        .eq('court_id', court.id)
        .gte('ends_at', new Date().toISOString())
        .order('starts_at', { ascending: true })

      if (error) {
        console.error('Error fetching RSVPs:', error)
      } else {
        setRsvps(data)
      }
    }

    fetchRsvps()

    const channel = supabase
      .channel(`rsvps:${court.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rsvps', filter: `court_id=eq.${court.id}` },
        (payload) => {
          fetchRsvps() // Refetch all RSVPs on change
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [court])

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

  if (!court) return null

  return (
    <div className="rsvp-container">
      <h4>Coming up</h4>
      {rsvps.length > 0 ? (
        <ul className="list">
          {rsvps.map((rsvp) => (
            <li key={rsvp.id}>
              <strong>{rsvp.display_name || 'Anonymous'}</strong> at{' '}
              {format(new Date(rsvp.starts_at), 'p')} on {format(new Date(rsvp.starts_at), 'MMM d')}
            </li>
          ))}
        </ul>
      ) : (
        <p>No upcoming RSVPs.</p>
      )}

      {session && (
        <form onSubmit={handleRsvp} className="rsvp-form">
          <h5>RSVP for a slot</h5>
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
          <button type="submit" disabled={loading || isAlreadyBooked} className="btn">
            {isAlreadyBooked ? 'Already booked' : (loading ? '...' : 'RSVP')}
          </button>
          {isAlreadyBooked && <p className="kicker" style={{textAlign: 'center', margin: '4px 0 0'}}>You have already booked this time slot.</p>}
        </form>
      )}
    </div>
  )
}
