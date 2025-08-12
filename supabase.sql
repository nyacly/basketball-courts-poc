-- 🏀 Hoops Near Me --
-- This script can be run to set up the database schema from scratch.
-- It is idempotent and will drop existing objects before creating them.

-- Drop existing objects in reverse order of dependency
DROP VIEW IF EXISTS public.v_checkins;
DROP VIEW IF EXISTS public.v_rsvps;
DROP TABLE IF EXISTS public.checkins;
DROP TABLE IF EXISTS public.rsvps;
DROP TABLE IF EXISTS public.profiles;

-- Enable pgcrypto for uuid gen if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table for public user profiles
-- This table is linked to the auth.users table
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NULL,
  created_at timestamptz NULL DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Public-facing user profiles.';

-- Table for RSVPs
CREATE TABLE public.rsvps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  court_id text NOT NULL,
  court_name text NULL,
  court_lga text NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NULL DEFAULT now()
);
COMMENT ON TABLE public.rsvps IS 'User RSVPs for court time slots.';

-- Table for live check-ins
CREATE TABLE public.checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  court_id text NOT NULL,
  court_name text NULL,
  court_lga text NULL,
  lat float8 NULL,
  lon float8 NULL,
  accuracy_m float8 NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
COMMENT ON TABLE public.checkins IS 'User check-ins at courts.';

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Policies for profiles table
CREATE POLICY "profiles are read by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users can upsert their profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users can update their profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for rsvps table
CREATE POLICY "rsvps are readable by all" ON public.rsvps FOR SELECT USING (true);
CREATE POLICY "users can create rsvps" ON public.rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users can update their own rsvps" ON public.rsvps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users can delete their own rsvps" ON public.rsvps FOR DELETE USING (auth.uid() = user_id);

-- Policies for checkins table
CREATE POLICY "checkins are readable by all" ON public.checkins FOR SELECT USING (true);
CREATE POLICY "users can create checkins" ON public.checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users can delete their own checkins" ON public.checkins FOR DELETE USING (auth.uid() = user_id);

-- Helper view to join RSVPs with user display names
CREATE OR REPLACE VIEW public.v_rsvps AS
  SELECT r.id,
      r.user_id,
      r.court_id,
      r.court_name,
      r.court_lga,
      r.starts_at,
      r.ends_at,
      p.display_name
    FROM (public.rsvps r
      LEFT JOIN public.profiles p ON ((p.id = r.user_id)));
COMMENT ON VIEW public.v_rsvps IS 'Public view of RSVPs with display names.';

-- Helper view to join check-ins with user display names
CREATE OR REPLACE VIEW public.v_checkins AS
  SELECT c.id,
      c.user_id,
      c.court_id,
      c.court_name,
      c.court_lga,
      c.checked_in_at,
      c.expires_at,
      p.display_name
    FROM (public.checkins c
      LEFT JOIN public.profiles p ON ((p.id = c.user_id)));
COMMENT ON VIEW public.v_checkins IS 'Public view of active check-ins with display names.';

-- Advise on setting up realtime
-- In Supabase dashboard: Database -> Replication -> add tables rsvps, checkins to realtime publication.
