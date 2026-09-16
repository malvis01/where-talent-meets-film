'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'malvisdabz@gmail.com'

export default function AdminLoginPage() {
  const [email, setEmail] = useState(ADMIN_EMAIL)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setMessage('')
    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      setMessage('Administrator login is restricted to the designated administrator account.')
      setBusy(false)
      return
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password })
    if (error) {
      setMessage(error.message)
      setBusy(false)
      return
    }
    if (!data.user) {
      setMessage('Administrator account could not be loaded.')
      setBusy(false)
      return
    }
    const { data: isAdmin, error: roleError } = await supabase.rpc('is_admin', { uid: data.user.id })
    if (roleError || !isAdmin) {
      await supabase.auth.signOut()
      setMessage('This account is not configured as an administrator.')
      setBusy(false)
      return
    }
    window.location.href = '/admin/payments'
  }

  return <main className="payment-page container"><a className="back-link" href="/">← Where Talent Meets Film</a><div className="payment-card auth-card"><div className="eyebrow">Administrator access</div><h1>Admin login.</h1><p className="muted">Only the designated administrator account can access the administration area.</p><label>Administrator email<input type="email" value={email} readOnly /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Administrator password" autoComplete="current-password" /></label>{message && <div className="info-box"><p>{message}</p></div>}<button className="btn primary" disabled={busy || !password} onClick={submit}>{busy ? 'Checking…' : 'Sign in to Admin →'}</button><a className="btn secondary" href="/login">User login</a></div></main>
}
