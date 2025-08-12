'use client'
import { createContext, useState, useEffect, useContext } from 'react'
import { supabase } from '@/components/supabase'
import Auth from './Auth'
const SessionContext = createContext(null)

export const useSession = () => useContext(SessionContext)

export default function AuthWrapper({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setLoading(false)
    }
    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session?.user) {
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', session.user.id)
          .single()
        if (error && error.code !== 'PGRST116') { // ignore no rows found
          console.error('Error fetching profile:', error)
        }
        setProfile(data)
      }
      fetchProfile()
    } else {
      setProfile(null)
    }
  }, [session])

  return (
    <SessionContext.Provider value={{ session, profile, loading }}>
      <header className="header">
        <div className="brand">
          Hoops Near Me <span className="badge">POC</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Auth />
        </div>
      </header>
      {children}
    </SessionContext.Provider>
  )
}
