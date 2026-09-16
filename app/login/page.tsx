'use client'

import { FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabase'

function normalizePhone(value: string) {
  return value.trim().replace(/[\s()-]/g, '')
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage('')

    try {
      const normalizedPhone = normalizePhone(phone)
      if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
        setMessage('Enter a valid international phone number, including the country code (for example, +2348012345678).')
        return
      }
      if (password.length < 8) {
        setMessage('Password must be at least 8 characters.')
        return
      }

      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ phone: normalizedPhone, password })
        : await supabase.auth.signUp({ phone: normalizedPhone, password })

      if (result.error) {
        setMessage(result.error.message)
        return
      }

      if (!result.data.user) {
        setMessage('Supabase did not return an account. Please try again.')
        return
      }

      if (!result.data.session) {
        setMessage('The account was created, but Supabase is still requiring phone confirmation. Turn off phone confirmation in Authentication → Providers → Phone, then try again.')
        return
      }

      window.location.assign('/account')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong while signing in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="payment-page container">
      <a className="back-link" href="/">← Where Talent Meets Film</a>
      <div className="payment-card auth-card">
        <div className="eyebrow">Talent account access</div>
        <h1>{mode === 'login' ? 'Sign in.' : 'Create your account.'}</h1>
        <p className="muted">Normal platform users use a phone number and password. No OTP is used for this login.</p>
        <form onSubmit={submit}>
          <label>Phone number<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2348012345678" autoComplete="tel" inputMode="tel" required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
          {message && <div className="info-box" role="alert"><strong>Account update</strong><p>{message}</p></div>}
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : mode === 'login' ? 'Sign in →' : 'Create account →'}</button>
        </form>
        <button className="btn secondary" type="button" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>{mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}</button>
        <a className="btn secondary" href="/admin/login">Administrator login</a>
      </div>
    </main>
  )
}
