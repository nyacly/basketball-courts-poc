# Basketball Courts POC (Brisbane + Moreton Bay)

MVP to:
- map public **basketball courts**, starting with **City of Moreton Bay**,
- let people **RSVP** to a time,
- **check in** on arrival (GPS within a small radius),
- show **who’s here now** and **who’s coming** for a court.

## Data sources
- **City of Moreton Bay – Park_Details** (ArcGIS FeatureServer, includes `Basketball_Court` field — updated weekly).
  Query example used by this app (GeoJSON): `https://services-ap1.arcgis.com/152ojN3Ts9H3cdtl/arcgis/rest/services/MBRCParkDetails/FeatureServer/0/query?where=Basketball_Court%20%3D%20%27Yes%27&outFields=OBJECTID,Description,Suburb,ADDRESS,Basketball_Court&outSR=4326&f=geojson`
- **Queensland Govt – Sports fields – Queensland** (state topographic dataset that includes courts). For Brisbane coverage you can prefilter to basketball and set `BRISBANE_SPORTS_FIELDS_GEOJSON_URL` to a ready GeoJSON endpoint/file.

## One-time setup

1) **Create a Supabase project** and copy the URL + anon key into `.env.local`.
2) In Supabase SQL editor, run `supabase.sql` from this repo to create tables, RLS policies and helpers.
3) (Optional) Set up **email OTP** (Auth → Providers → Email) so users can sign in with a magic link.
4) Create a **MapTiler** key (free) and put it in `.env.local`.

```bash
cp .env.example .env.local
# fill in env vars
npm i
npm run dev
```

Optional tests:

```
npx playwright install
npx playwright test
```

Open http://localhost:3000

## Features
- **Clustered map** of courts (MBRC out-of-the-box; Brisbane via optional GeoJSON env).
- **Court drawer** with “Happening now” (live check-ins) & “Coming up” (RSVPs).
- **RSVP**: pick date & 1-hour slot.
- **Check-in**: requires GPS fix **≤120 m** from the court point (configurable) and auto-expires after **90 mins**.
- **Auth**: passwordless email (Supabase). Minimal profile (first name + initial recommended).

## Extend to Brisbane City Council
- If you have a filtered GeoJSON of **basketball courts only** for Brisbane LGA, set `BRISBANE_SPORTS_FIELDS_GEOJSON_URL`.
- Alternatively, ingest Queensland’s **Sports fields – Queensland** data and filter for “basketball” features inside Brisbane bounds, then host the filtered GeoJSON somewhere accessible (e.g. Supabase Storage public file) and point the env var to it.

## Deploy (free to validate)
- **Web:** Vercel (import GitHub repo). Set env vars in Vercel.
- **DB/Realtime/Auth:** Supabase free tier.
- **Tiles:** MapTiler free dev plan.

## Security & privacy
- RLS ensures users can only write their own RSVPs/check-ins.
- Public reading shows **display name only** (set in profile). Store minimal info.

## Acknowledgements
- City of Moreton Bay “MBRC Park Details” (weekly). 
- Queensland Government “Sports fields – Queensland” (courts & fields).

— Generated on 2025-08-10
