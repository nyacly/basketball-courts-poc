import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabaseClient';

const Body = z.object({
  courtId: z.string().min(1),
  courtName: z.string().min(1),
  startsAt: z.string().transform(v => new Date(v)),
  email: z.string().email().optional(),
  name: z.string().optional(),
});

function getUserIdFromCookies(): string | null {
  return cookies().get('uid')?.value ?? null;
}

// simple per-IP limiter
const ipHits = new Map<string, { count: number; ts: number }>();
function checkLimit(ip: string) {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (entry && now - entry.ts < 60_000) {
    entry.count++;
    if (entry.count > 30) return false; // allow 30 req/min
  } else {
    ipHits.set(ip, { count: 1, ts: now });
  }
  return true;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courtId = searchParams.get('courtId') ?? '';
  const startsAt = searchParams.get('startsAt') ?? '';
  if (!courtId || !startsAt) return NextResponse.json({ ok:false, error:'missing params' }, { status:400 });

  const supa = createClient();
  const { count, error } = await supa
    .from('rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('court_id', courtId)
    .eq('starts_at', new Date(startsAt).toISOString());
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true, count });
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'local';
  if (!checkLimit(ip)) return NextResponse.json({ ok:false, error:'rate limit' }, { status:429 });
  const raw = await req.json();
  const parse = Body.safeParse(raw);
  if (!parse.success) return NextResponse.json({ ok:false, error:'invalid body' }, { status:400 });

  const uid = getUserIdFromCookies();
  if (!uid) return NextResponse.json({ ok:false, error:'no user id' }, { status:401 });

  const { courtId, courtName, startsAt, email, name } = parse.data;

  const supa = createClient();
  const { data, error } = await supa
    .from('rsvps')
    .upsert({
      user_id: uid,
      court_id: courtId,
      court_name: courtName,
      starts_at: new Date(startsAt).toISOString(),
      email: email ?? null,
      name: name ?? null,
    }, { onConflict: 'user_id,court_id,starts_at' })
    .select()
    .single();

  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });

  const { count } = await supa
    .from('rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('court_id', courtId)
    .eq('starts_at', new Date(startsAt).toISOString());

  return NextResponse.json({ ok:true, rsvp: data, count, created: true });
}

export async function DELETE(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'local';
  if (!checkLimit(ip)) return NextResponse.json({ ok:false, error:'rate limit' }, { status:429 });

  const { searchParams } = new URL(req.url);
  const uid = getUserIdFromCookies();
  if (!uid) return NextResponse.json({ ok:false, error:'no user id' }, { status:401 });

  const courtId = searchParams.get('courtId') ?? '';
  const startsAt = searchParams.get('startsAt') ?? '';
  if (!courtId || !startsAt) return NextResponse.json({ ok:false, error:'missing params' }, { status:400 });

  const supa = createClient();
  const { error } = await supa
    .from('rsvps')
    .delete()
    .eq('user_id', uid)
    .eq('court_id', courtId)
    .eq('starts_at', new Date(startsAt).toISOString());

  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}
