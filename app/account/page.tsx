'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AccountPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState<{ id: string; phone?: string | null; email?: string | null } | null>(null)
  const [profile, setProfile] = useState<{ display_name: string | null; country: string | null; city: string | null; role: string | null; profile_completed: number | null; profile_picture_path: string | null } | null>(null)
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) {
        if (active) { setMessage(error?.message || 'Please sign in to access your account.'); setLoading(false) }
        return
      }
      if (!active) return
      setUser({ id: data.user.id, phone: data.user.phone, email: data.user.email })
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('display_name,country,city,role,profile_completed,profile_picture_path').eq('id', data.user.id).maybeSingle()
      if (profileError) setMessage(profileError.message)
      if (active) setProfile(profileData)
      if (profileData?.profile_picture_path) {
        const { data: signed } = await supabase.storage.from('actor-media').createSignedUrl(profileData.profile_picture_path, 60 * 60)
        if (active && signed?.signedUrl) setProfilePictureUrl(signed.signedUrl)
      }
      if (active) setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.assign('/')
  }

  if (loading) return <main className="payment-page container"><div className="payment-card"><p>Loading your account…</p></div></main>
  if (!user) return <main className="payment-page container"><a className="back-link" href="/">← Where Talent Meets Film</a><div className="payment-card"><div className="eyebrow">Account access</div><h1>Please sign in.</h1>{message && <div className="info-box"><p>{message}</p></div>}<a className="btn primary" href="/login">Go to login →</a></div></main>

  const isProduction = profile?.role === 'production'

  return (
    <main className="payment-page container">
      <a className="back-link" href="/">← Where Talent Meets Film</a>
      <div className="payment-header">
        <div className="account-heading">
          <div className="account-avatar">{profilePictureUrl ? <img src={profilePictureUrl} alt="Your profile" /> : <span>{(profile?.display_name || 'U').charAt(0).toUpperCase()}</span>}</div>
          <div><div className="eyebrow">{isProduction ? 'Production workspace' : 'Your talent account'}</div><h1>Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}.</h1><p>{isProduction ? 'Manage your production profile, casting opportunities, applicants, services and customer care from one place.' : 'Your account is your home for your talent profile, services, payments and customer care.'}</p></div>
        </div>
        <button className="btn secondary" onClick={signOut}>Sign out</button>
      </div>
      {message && <div className="info-box"><p>{message}</p></div>}
      <section className="payment-layout">
        <div className="payment-card"><h2>Account details</h2><p><strong>Phone:</strong> {user.phone || 'Not set'}</p><p><strong>Country:</strong> {profile?.country || 'Not set'}</p><p><strong>City:</strong> {profile?.city || 'Not set'}</p><p><strong>Account type:</strong> {profile?.role || 'actor'}</p><p><strong>Profile readiness:</strong> {profile?.profile_completed ?? 0}%</p>{!profilePictureUrl && !isProduction && <p className="muted">No profile picture uploaded yet. Add one while building your actor profile.</p>}</div>
        <div className="payment-card"><h2>{isProduction ? 'Production workspace' : 'Platform services'}</h2><p className="muted">{isProduction ? 'Create and manage casting calls, review applicants, request services and contact customer care.' : 'Build your professional profile, request services and track payment instructions from one account.'}</p><div className="actions">{isProduction ? <><a className="btn primary" href="/production/casting">Manage casting →</a><a className="btn secondary" href="/payments">Services & payments →</a><a className="btn secondary" href="/support">Chat with customer care →</a></> : <><a className="btn primary" href="/actors/register">Build / update actor profile →</a><a className="btn secondary" href="/payments">Services & payments →</a><a className="btn secondary" href="/support">Chat with customer care →</a></>}</div></div>
      </section>
    </main>
  )
}
