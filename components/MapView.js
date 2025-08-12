'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster' // provides L.markerClusterGroup
import { haversine } from '@/lib/haversine'

export default function MapView({ data, onSelect, activeCourtIds = [] }) {
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const clusterRef = useRef(null)
  const meRef = useRef(null)
  const nearestLayerRef = useRef(null)

  // minimal css for dots/clusters/controls
  useEffect(() => {
    if (document.getElementById('hnm-cluster-css')) return
    const css = `
      .hnm-dot{width:12px;height:12px;border-radius:9999px;background:#35c0ff;border:2px solid #003a53;transition:background .3s}
      .hnm-dot.active{background:#6be675;border-color:#0a5b14;box-shadow:0 0 8px #6be675;}
      .hnm-cluster{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:#ff6a00;color:#111;font-weight:700;font-size:12px;border:2px solid #7a3800;box-shadow:0 0 0 2px rgba(0,0,0,.15)}
      .hnm-me{width:14px;height:14px;border-radius:999px;background:#6be675;border:2px solid #0a5b14}
      .leaflet-control-locate{background:#111;color:#fff;border:1px solid #333;border-radius:8px;padding:4px 8px;cursor:pointer}
      .leaflet-control-locate:hover{background:#1a1a1a}
    `
    const style = document.createElement('style')
    style.id = 'hnm-cluster-css'
    style.appendChild(document.createTextNode(css))
    document.head.appendChild(style)
  }, [])

  // init once
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return

    const map = L.map(mapEl.current, { zoomControl: true, attributionControl: true, preferCanvas: true })
    map.setView([-27.39, 153.02], 11)

    // tiles via local proxy (robust to blockers)
    L.tileLayer('/api/tiles/carto/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors, © CARTO',
    }).addTo(map)

    // clustering
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      iconCreateFunction: (c) =>
        L.divIcon({ className: 'hnm-cluster', html: c.getChildCount(), iconSize: [30, 30] }),
    })
    cluster.addTo(map)

    // zoom / spiderfy on cluster click
    cluster.on('clusterclick', (e) => {
      e.originalEvent?.preventDefault?.()
      if (e.layer.spiderfy && e.layer.options.spiderfyOnMaxZoom !== false) e.layer.spiderfy()
      else map.fitBounds(e.layer.getBounds(), { padding: [40, 40] })
    })

    // group to highlight nearest
    nearestLayerRef.current = L.layerGroup().addTo(map)

    // "Near me" control
    const Locate = L.Control.extend({
      onAdd: () => {
        const btn = L.DomUtil.create('button', 'leaflet-control-locate')
        btn.type = 'button'
        btn.title = 'Near me'
        btn.innerText = 'Near me'
        btn.onclick = () => locateAndZoom(map, cluster, nearestLayerRef.current, meRef)
        return btn
      },
    })
    map.addControl(new Locate({ position: 'topleft' }))

    mapRef.current = map
    clusterRef.current = cluster

    // initial markers
    rebuildMarkers(cluster, data, onSelect)

    requestAnimationFrame(() => map.invalidateSize(true))

    return () => {
      try { map.remove() } catch {}
      mapRef.current = null
      clusterRef.current = null
      nearestLayerRef.current = null
      meRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // update when data changes
  useEffect(() => {
    if (!clusterRef.current) return
    rebuildMarkers(clusterRef.current, data, onSelect, activeCourtIds)
  }, [data, onSelect, activeCourtIds])

  return <div ref={mapEl} style={{ position: 'absolute', inset: 0 }} />
}

/* ---------------- helpers ---------------- */

function rebuildMarkers(cluster, geojson, onSelect, activeCourtIds) {
  cluster.clearLayers()
  const feats = geojson?.features || []

  for (const f of feats) {
    if (f?.geometry?.type !== 'Point') continue
    const [lon, lat] = f.geometry.coordinates
    const p = f.properties || {}

    const isActive = activeCourtIds?.includes(p.id)
    const icon = L.divIcon({
      className: `hnm-dot ${isActive ? 'active' : ''}`,
      html: '',
      iconSize: [12, 12],
    })

    const m = L.marker([lat, lon], { icon, title: p.title || 'Basketball court' })

    // 1) Fire selection on plain marker click (bullet-proof)
    m.on('click', () => {
      onSelect?.({
        id: p.id,
        title: p.title,
        address: p.address || null,
        suburb: p.suburb || null,
        lga: p.lga || null,
        lat,
        lon,
      })
    })

    // 2) Keep popup + Select button as well
    const addr = [p.address, p.suburb].filter(Boolean).join(', ')
    m.bindPopup(
      `<b>${esc(p.title || 'Basketball court')}</b><br/>${esc(addr)}${
        p.lga ? `<br/><small>${esc(p.lga)}</small>` : ''
      }<br/><button id="hnm-sel" style="margin-top:6px;padding:6px 8px;border-radius:8px;border:0;background:#ff6a00;color:#111;font-weight:600;">Select</button>`
    )
    m.on('popupopen', (e) => {
      const el = e.popup?._contentNode?.querySelector('#hnm-sel')
      if (el) {
        el.addEventListener(
          'click',
          () => {
            onSelect?.({
              id: p.id,
              title: p.title,
              address: p.address || null,
              suburb: p.suburb || null,
              lga: p.lga || null,
              lat,
              lon,
            })
          },
          { once: true }
        )
      }
    })

    cluster.addLayer(m)
  }
}

function locateAndZoom(map, cluster, nearestLayer, meRef) {
  if (!navigator.geolocation) {
    alert('Geolocation not available in this browser')
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const me = [pos.coords.latitude, pos.coords.longitude]
      const meIcon = L.divIcon({ className: 'hnm-me', html: '', iconSize: [14, 14] })
      if (!meRef.current) meRef.current = L.marker(me, { icon: meIcon }).addTo(map)
      else meRef.current.setLatLng(me)

      const all = []
      cluster.eachLayer((child) => {
        if (child.getLatLng) all.push({ ll: child.getLatLng(), layer: child })
      })
      all.sort(
        (a, b) =>
          haversine(me[0], me[1], a.ll.lat, a.ll.lng) -
          haversine(me[0], me[1], b.ll.lat, b.ll.lng)
      )
      const nearest = all.slice(0, 10)

      nearestLayer.clearLayers()
      const group = L.featureGroup()
      nearest.forEach(({ ll }) =>
        group.addLayer(
          L.circle(ll, { radius: 120, color: '#00c2ff', weight: 2, opacity: 0.7, fillOpacity: 0.05 })
        )
      )
      group.addTo(nearestLayer)

      const bounds = L.latLngBounds([me, ...nearest.map((n) => [n.ll.lat, n.ll.lng])])
      map.fitBounds(bounds, { padding: [40, 40] })
    },
    (err) => alert(err.message),
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
