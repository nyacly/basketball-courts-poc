-- Enable pgcrypto for uuid gen if needed
create extension if not exists pgcrypto;

-- Profiles: minimal public identity
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles are read by all" on public.profiles
for select using ( true );

create policy "users can upsert their profile"
on public.profiles for insert with check ( auth.uid() = id );

create policy "users can update their profile"
on public.profiles for update using ( auth.uid() = id );

-- RSVPs
create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  court_id text not null,
  court_name text,
  court_lga text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz default now()
);

alter table public.rsvps enable row level security;

create policy "rsvps are readable by all"
on public.rsvps for select using ( true );

create policy "users can create rsvps"
on public.rsvps for insert with check ( auth.uid() = user_id );

create policy "users can update their own rsvps"
on public.rsvps for update using ( auth.uid() = user_id );

create policy "users can delete their own rsvps"
on public.rsvps for delete using ( auth.uid() = user_id );

-- Check-ins
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  court_id text not null,
  court_name text,
  court_lga text,
  lat double precision,
  lon double precision,
  accuracy_m double precision,
  checked_in_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.checkins enable row level security;

create policy "checkins are readable by all"
on public.checkins for select using ( true );

create policy "users can create checkins"
on public.checkins for insert with check ( auth.uid() = user_id );

create policy "users can delete their own checkins"
on public.checkins for delete using ( auth.uid() = user_id );

-- Helper views to join display names without exposing emails
create or replace view public.v_checkins as
  select c.id, c.court_id, c.court_name, c.court_lga, c.checked_in_at, c.expires_at,
         p.display_name
  from public.checkins c
  left join public.profiles p on p.id = c.user_id;

create or replace view public.v_rsvps as
  select r.id, r.court_id, r.court_name, r.court_lga, r.starts_at, r.ends_at,
         p.display_name
  from public.rsvps r
  left join public.profiles p on p.id = r.user_id;

comment on view public.v_checkins is 'Public view of active check-ins with display names';
comment on view public.v_rsvps is 'Public view of RSVPs with display names';

-- Realtime
-- In Supabase: Database -> Replication -> add tables rsvps, checkins for realtime (or use 'Full' for public schema)
