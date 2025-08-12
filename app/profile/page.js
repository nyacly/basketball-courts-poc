'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/components/supabase'
import { useSession } from '@/components/AuthWrapper'

export default function Profile() {
  const { session, profile, loading: sessionLoading } = useSession()
  const [loading, setLoading] = useState(false)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
    }
  }, [profile])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        display_name: displayName,
        updated_at: new Date(),
      })
      if (error) throw error
      alert('Profile updated!')
    } catch (error) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  if (sessionLoading) {
    return <div>Loading...</div>
  }

  if (!session) {
    return <div>Please log in to view your profile.</div>
  }

  return (
    <main className="container">
      <h1>Your Profile</h1>
      <form onSubmit={handleUpdateProfile} style={{ maxWidth: 400 }}>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="text" value={session.user.email} disabled className="input" />
        </div>
        <div style={{ marginTop: 16 }}>
          <label htmlFor="displayName" className="label">Display Name</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input"
          />
        </div>
        <div style={{ marginTop: 24 }}>
          <button type="submit" disabled={loading} className="btn">
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </main>
  )
}
