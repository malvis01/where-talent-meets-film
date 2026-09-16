'use client'

import { FormEvent, useState } from 'react'
import { authenticateWithPhone } from '@/lib/phone-auth'

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
      await authenticateWithPhone(phone, password, mode)
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
        <p className="muted">Normal platform users use a phone number and password. No OTP, SMS provider or email login is required.</p>
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
