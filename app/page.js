'use client'
import { useState, useEffect } from 'react'
import MapView from '@/components/MapView'
import Rsvp from '@/components/Rsvp'
import Checkin from '@/components/Checkin'

export default function Page() {
  const [data, setData] = useState({ type: 'FeatureCollection', features: [] })
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/api/courts').then(r => r.json()).then(setData).catch(console.error)
  }, [])

  return (
    <main className="main-grid">
      <div className="map-wrap">
        <MapView data={data} onSelect={setSelected} />
      </div>
      <aside className="panel">
        <h3>Selected court</h3>
        {selected ? (
          <div>
            <div><b>{selected.title}</b></div>
            <div>{selected.address}</div>
            <div>{selected.suburb} — {selected.lga}</div>
            <div className="kicker" style={{ marginTop: 4 }}>
              lat {selected.lat.toFixed(4)}, lon {selected.lon.toFixed(4)}
            </div>
            <Checkin court={selected} />
            <Rsvp court={selected} />
          </div>
        ) : <div className="kicker">Tap a marker or press “Select” in a popup.</div>}
      </aside>
    </main>
  )
}
