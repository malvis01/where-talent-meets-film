'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true); setMessage('')
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (result.error) setMessage(result.error.message)
    else if (mode === 'signup' && !result.data.session) setMessage('Account created. Check your email if email confirmation is enabled, then sign in.')
    else window.location.href = '/payments'
    setBusy(false)
  }

  return <main className="payment-page container"><a className="back-link" href="/">← Where Talent Meets Film</a><div className="payment-card auth-card"><div className="eyebrow">Account access</div><h1>{mode === 'login' ? 'Sign in.' : 'Create your account.'}</h1><p className="muted">You need an account to request services and submit payment proof.</p><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>{message && <div className="info-box"><p>{message}</p></div>}<button className="btn primary" disabled={busy || !email || !password} onClick={submit}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in →' : 'Create account →'}</button><button className="btn secondary" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>{mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}</button></div></main>
}
