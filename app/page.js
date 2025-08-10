'use client'
import { useState, useEffect } from 'react'
import MapView from '@/components/MapView'

export default function Page() {
  const [data, setData] = useState({ type: 'FeatureCollection', features: [] })
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/api/courts').then(r => r.json()).then(setData).catch(console.error)
  }, [])

  return (
    <main style={{ display:'grid', gridTemplateColumns:'1fr 360px', height:'calc(100vh - 64px)' }}>
      <div style={{ position:'relative' }}>
        <MapView data={data} onSelect={setSelected} />
      </div>
      <aside style={{ padding:16, borderLeft:'1px solid #e5e7eb' }}>
        <h3>Selected court</h3>
        {selected ? (
          <div>
            <div><b>{selected.title}</b></div>
            <div>{selected.address}</div>
            <div>{selected.suburb} — {selected.lga}</div>
            <div style={{ fontSize:12, opacity:.7 }}>lat {selected.lat}, lon {selected.lon}</div>
          </div>
        ) : <div>Tap a marker or press “Select” in a popup.</div>}
      </aside>
    </main>
  )
}
