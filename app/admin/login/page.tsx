'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'malvisdabz@gmail.com'

type AuthData = {
  user: import('@supabase/supabase-js').User | null
  session: import('@supabase/supabase-js').Session | null
}

export default function AdminLoginPage() {
  const [email] = useState(ADMIN_EMAIL)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function verifyAdmin(userId: string) {
    const { data: isAdmin, error } = await supabase.rpc('is_admin', { uid: userId })
    if (error) throw error
    if (!isAdmin) throw new Error('This account is not configured as an administrator.')
  }

  async function submit() {
    if (busy || !password) return
    setBusy(true)
    setMessage('')

    try {
      let data: AuthData | null = null
      let { data: signInData, error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password })
      data = signInData

      // This project was newly connected to Supabase and the designated admin
      // account may not exist yet. If it does not exist, create it through the
      // normal Auth signup flow. The database trigger promotes this exact email
      // to the admin role; no password is stored in application code.
      if (error) {
        const signup = await supabase.auth.signUp({
          email: ADMIN_EMAIL,
          password,
          options: { data: { full_name: 'Malvis', name: 'Malvis' } },
        })
        if (signup.error) throw error
        data = signup.data
        if (!data.user) throw new Error('Administrator account could not be created.')
        if (!data.session) {
          throw new Error('The administrator account was created, but email confirmation is enabled. Disable email confirmation in Supabase Authentication settings, then sign in again.')
        }
      }

      if (!data?.user) throw new Error('Administrator account could not be loaded.')
      await verifyAdmin(data.user.id)
      window.location.assign('/admin/payments')
    } catch (error) {
      await supabase.auth.signOut()
      setMessage(error instanceof Error ? error.message : 'Administrator login failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="payment-page container">
      <a className="back-link" href="/">← Where Talent Meets Film</a>
      <div className="payment-card auth-card">
        <div className="eyebrow">Administrator access</div>
        <h1>Admin login.</h1>
        <p className="muted">Only the designated administrator account can access the administration area.</p>
        <label>Administrator email<input type="email" value={email} readOnly /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Administrator password" autoComplete="current-password" /></label>
        {message && <div className="info-box" role="alert"><strong>Administrator update</strong><p>{message}</p></div>}
        <button className="btn primary" disabled={busy || !password} onClick={submit}>{busy ? 'Checking…' : 'Sign in to Admin →'}</button>
        <a className="btn secondary" href="/login">User login</a>
      </div>
    </main>
  )
}
