'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setMessage('')
    const normalizedPhone = phone.trim()
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ phone: normalizedPhone, password })
      : await supabase.auth.signUp({ phone: normalizedPhone, password })

    if (result.error) {
      setMessage(result.error.message)
    } else if (mode === 'signup' && !result.data.session) {
      setMessage('Account created, but phone confirmation is enabled. Disable phone confirmation in Supabase Auth settings so users can enter with phone and password only.')
    } else {
      window.location.href = '/payments'
    }
    setBusy(false)
  }

  return <main className="payment-page container"><a className="back-link" href="/">← Where Talent Meets Film</a><div className="payment-card auth-card"><div className="eyebrow">Talent account access</div><h1>{mode === 'login' ? 'Sign in.' : 'Create your account.'}</h1><p className="muted">Platform users sign in with their phone number and password. No email login is used for normal users.</p><label>Phone number<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2348012345678" autoComplete="tel" /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>{message && <div className="info-box"><p>{message}</p></div>}<button className="btn primary" disabled={busy || !phone || !password} onClick={submit}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in →' : 'Create account →'}</button><button className="btn secondary" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>{mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}</button><a className="btn secondary" href="/admin/login">Administrator login</a></div></main>
}
