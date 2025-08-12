import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabaseClient';
import { haversine } from '@/lib/haversine';

const Body = z.object({
  courtId: z.string().min(1),
  courtName: z.string().min(1),
  courtLat: z.number(),
  courtLon: z.number(),
  lat: z.number(),
  lon: z.number(),
  accuracy: z.number().optional(),
  source: z.enum(['gps', 'map_center']),
});

function getUserIdFromCookies(): string | null {
  return cookies().get('uid')?.value ?? null;
}

export async function POST(req: Request) {
  const raw = await req.json();
  const parse = Body.safeParse(raw);
  if (!parse.success) return NextResponse.json({ ok:false, error:'invalid body' }, { status:400 });

  const uid = getUserIdFromCookies();
  if (!uid) return NextResponse.json({ ok:false, error:'no user id' }, { status:401 });

  const { courtId, courtName, courtLat, courtLon, lat, lon, accuracy, source } = parse.data;

  const dist = haversine(lat, lon, courtLat, courtLon);
  if (dist > 500) {
    return NextResponse.json({ ok:false, error:'too far', dist }, { status:400 });
  }

  const supa = createClient();
  await supa.from('checkins').insert({
    user_id: uid,
    court_id: courtId,
    court_name: courtName,
    lat,
    lon,
    accuracy,
    source,
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  });

  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data } = await supa
    .from('checkins')
    .select('*')
    .eq('court_id', courtId)
    .gte('checked_in_at', since)
    .order('checked_in_at', { ascending: false });

  return NextResponse.json({ ok:true, checkins: data, dist });
}
