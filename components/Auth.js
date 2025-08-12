'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from './AuthWrapper'
import Link from 'next/link'

export default function Auth() {
  const { session, profile } = useSession()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      alert('Check your email for the login link!')
    } catch (error) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
      setEmail('')
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <form onSubmit={handleLogin} className="auth-form">
        <input
          type="email"
          placeholder="Your email"
          value={email}
          required={true}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />
        <button type="submit" disabled={loading} className="auth-button">
          {loading ? '...' : 'Login'}
        </button>
      </form>
    )
  }

  return (
    <div className="auth-loggedin">
      Hi, <Link href="/profile" className="auth-profile-link">{profile?.display_name || session.user.email}</Link>
      <button onClick={handleLogout} disabled={loading} className="auth-button">
        {loading ? '...' : 'Logout'}
      </button>
    </div>
  )
}
