import { createClient as _createClient } from '@supabase/supabase-js'

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if(!url || !key) console.warn('Supabase env vars missing')
  return _createClient(url, key, { auth: { persistSession: true } })
}
export default createClient
