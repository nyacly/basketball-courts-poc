import { NextResponse } from 'next/server'

export const revalidate = 60 * 60 // 1 hour

const MBRC_URL = 'https://services-ap1.arcgis.com/152ojN3Ts9H3cdtl/arcgis/rest/services/MBRCParkDetails/FeatureServer/0/query?where='
  + encodeURIComponent("Basketball_Court = 'Yes'")
  + '&outFields=' + encodeURIComponent('OBJECTID,Description,Suburb,ADDRESS,Basketball_Court')
  + '&outSR=4326&f=geojson'

export async function GET(){
  try{
    const [mbrc, bris] = await Promise.allSettled([
      fetch(MBRC_URL, { next: { revalidate: 3600 }}).then(r=>r.json()),
      (async ()=>{
        const url = process.env.BRISBANE_SPORTS_FIELDS_GEOJSON_URL
        if(!url) return null
        try { return await fetch(url, { next: { revalidate: 86400 }}).then(r=>r.json()) } catch { return null }
      })()
    ])

    const features = []

    if(mbrc.status==='fulfilled' && mbrc.value?.features){
      for(const f of mbrc.value.features){
        const p = f.properties||{}
        features.push({
          type:'Feature',
          geometry: f.geometry,
          properties: {
            id: `mbrc-${p.OBJECTID}`,
            title: p.Description || p.ADDRESS || 'Basketball court',
            address: p.ADDRESS || null,
            suburb: p.Suburb || null,
            lga: 'Moreton Bay',
            source: 'MBRC Park_Details'
          }
        })
      }
    }

    if(bris.status==='fulfilled' && bris.value?.features){
      for(const f of bris.value.features){
        const p = f.properties||{}
        // Expect caller to prefilter to Brisbane + basketball courts
        features.push({
          type:'Feature',
          geometry: f.geometry,
          properties: {
            id: `bris-${p.id || p.OBJECTID || p.asset_id || Math.random().toString(36).slice(2)}`,
            title: p.name || p.Description || p.address || 'Basketball court',
            address: p.address || null,
            suburb: p.suburb || null,
            lga: 'Brisbane',
            source: 'Brisbane (external)'
          }
        })
      }
    }

    return NextResponse.json({ type:'FeatureCollection', features })
  }catch(e){
    return NextResponse.json({ type:'FeatureCollection', features: [], error: e.message }, { status: 200 })
  }
}
