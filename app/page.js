'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Rsvp from '@/components/Rsvp'
import Checkin from '@/components/Checkin'
import HomeCourtButton from '@/components/HomeCourtButton'
import { supabase } from '@/components/supabase'

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="map-wrap"><p style={{textAlign: 'center', paddingTop: 20}}>Loading map...</p></div>
})

export default function Page() {
  const [data, setData] = useState({ type: 'FeatureCollection', features: [] })
  const [selected, setSelected] = useState(null)
  const [rsvps, setRsvps] = useState([])
  const [activeCourtIds, setActiveCourtIds] = useState([])
  const [homeCourtCount, setHomeCourtCount] = useState(0)

  useEffect(() => {
    fetch('/api/courts').then(r => r.json()).then(setData).catch(console.error)

    // Fetch active check-ins periodically
    const fetchActive = () => fetch('/api/checkins/active').then(r => r.json()).then(setActiveCourtIds).catch(console.error)
    fetchActive()
    const interval = setInterval(fetchActive, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchRsvps = useCallback(async () => {
    if (!selected) return
    const { data, error } = await supabase
      .from('v_rsvps')
      .select('*')
      .eq('court_id', selected.id)
      .gte('ends_at', new Date().toISOString())
      .order('starts_at', { ascending: true })

    if (error) {
      console.error('Error fetching RSVPs:', error)
      setRsvps([])
    } else {
      setRsvps(data)
    }
  }, [selected])

  useEffect(() => {
    if (!selected) {
      setRsvps([])
      return
    }

    fetchRsvps()

    const channel = supabase
      .channel(`rsvps:${selected.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rsvps', filter: `court_id=eq.${selected.id}` },
        () => fetchRsvps()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selected, fetchRsvps])

  useEffect(() => {
    if (!selected) return
    fetch(`/api/courts/${selected.id}/home-court-count`)
      .then(r => r.json())
      .then(data => setHomeCourtCount(data.count))
      .catch(console.error)
  }, [selected])

  return (
    <main className="main-grid">
      <div className="map-wrap">
        <MapView data={data} onSelect={setSelected} activeCourtIds={activeCourtIds} />
      </div>
      <aside className="panel">
        {selected && <button onClick={() => setSelected(null)} className="panel-close-btn">×</button>}
        <h3>Selected court</h3>
        {selected ? (
          <div>
            <div><b>{selected.title}</b></div>
            <div>{selected.address}</div>
            <div>{selected.suburb} — {selected.lga}</div>
            <div className="kicker" style={{ marginTop: 4 }}>
              lat {selected.lat.toFixed(4)}, lon {selected.lon.toFixed(4)}
            </div>
            <div style={{ marginTop: 16 }}>
              <HomeCourtButton court={selected} homeCourtCount={homeCourtCount} />
            </div>
            <Checkin court={selected} rsvps={rsvps} />
            <Rsvp court={selected} rsvps={rsvps} onRsvpChange={fetchRsvps} />
          </div>
        ) : <div className="kicker">Tap a marker or press “Select” in a popup.</div>}
      </aside>
    </main>
  )
}
