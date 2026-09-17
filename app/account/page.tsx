'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Audition = { id:string; application_id:string; scheduled_at:string|null; note:string|null; status:string; project_name:string; role_name:string; casting_title:string }

export default function AccountPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState<{ id: string; phone?: string | null; email?: string | null } | null>(null)
  const [profile, setProfile] = useState<{ display_name: string | null; country: string | null; city: string | null; role: string | null; profile_completed: number | null; profile_picture_path: string | null } | null>(null)
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null)
  const [auditions, setAuditions] = useState<Audition[]>([])

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) { if (active) { setMessage(error?.message || 'Please sign in to access your account.'); setLoading(false) }; return }
      if (!active) return
      setUser({ id: data.user.id, phone: data.user.phone, email: data.user.email })
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('display_name,country,city,role,profile_completed,profile_picture_path').eq('id', data.user.id).maybeSingle()
      if (profileError) setMessage(profileError.message)
      if (active) setProfile(profileData)
      if (profileData?.profile_picture_path) { const { data: signed } = await supabase.storage.from('actor-media').createSignedUrl(profileData.profile_picture_path, 60 * 60); if (active && signed?.signedUrl) setProfilePictureUrl(signed.signedUrl) }
      if (profileData?.role !== 'production') {
        const { data: apps, error: appsError } = await supabase.from('applications').select('id,casting_call_id').eq('actor_user_id', data.user.id)
        if (!appsError && apps?.length) {
          const { data: aud, error: audError } = await supabase.from('auditions').select('id,application_id,scheduled_at,note,status').in('application_id', apps.map(a => a.id)).order('scheduled_at',{ascending:true,nullsFirst:false})
          if (!audError && aud?.length) {
            const callIds = [...new Set(apps.map(a => a.casting_call_id))]
            const { data: calls } = await supabase.from('casting_calls').select('id,title,project_name,role_name').in('id', callIds)
            const callMap:Record<string,any> = {}; (calls || []).forEach(c => callMap[c.id] = c)
            const appMap:Record<string,any> = {}; apps.forEach(a => appMap[a.id] = a)
            if (active) setAuditions((aud || []).map(a => ({ ...a, ...(callMap[appMap[a.application_id]?.casting_call_id] || {}), casting_title: callMap[appMap[a.application_id]?.casting_call_id]?.title || 'Casting call', project_name: callMap[appMap[a.application_id]?.casting_call_id]?.project_name || 'Project', role_name: callMap[appMap[a.application_id]?.casting_call_id]?.role_name || 'Role' })))
          } else if (active) setAuditions([])
        } else if (active) setAuditions([])
      }
      if (active) setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  async function signOut() { await supabase.auth.signOut(); window.location.assign('/') }
  if (loading) return <main className="payment-page container"><div className="payment-card"><p>Loading your account…</p></div></main>
  if (!user) return <main className="payment-page container"><a className="back-link" href="/">← Where Talent Meets Film</a><div className="payment-card"><div className="eyebrow">Account access</div><h1>Please sign in.</h1>{message && <div className="info-box"><p>{message}</p></div>}<a className="btn primary" href="/login">Go to login →</a></div></main>
  const isProduction = profile?.role === 'production'
  return (
    <main className="payment-page container">
      <a className="back-link" href="/">← Where Talent Meets Film</a>
      <div className="payment-header"><div className="account-heading"><div className="account-avatar">{profilePictureUrl ? <img src={profilePictureUrl} alt="Your profile" /> : <span>{(profile?.display_name || 'U').charAt(0).toUpperCase()}</span>}</div><div><div className="eyebrow">{isProduction ? 'Production workspace' : 'Your talent account'}</div><h1>Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}.</h1><p>{isProduction ? 'Manage your production profile, casting opportunities, applicants, services and customer care from one place.' : 'Your account is your home for your talent profile, auditions, services, payments and customer care.'}</p></div></div><button className="btn secondary" onClick={signOut}>Sign out</button></div>
      {message && <div className="info-box"><p>{message}</p></div>}
      {!isProduction && <section className="payment-card"><div className="payment-header"><div><div className="eyebrow">Casting</div><h2>Your auditions</h2></div><a className="btn secondary" href="/notifications">Notifications</a></div>{auditions.length===0?<p className="muted">No audition invitations yet. When a production schedules an audition for one of your applications, it will appear here and in your notifications.</p>:<div className="admin-list">{auditions.map(a=><article key={a.id}><strong>{a.project_name} · {a.role_name}</strong><span>{a.casting_title} · {a.status.replaceAll('_',' ')}</span><small>{a.scheduled_at ? `Scheduled: ${new Date(a.scheduled_at).toLocaleString()}` : 'Date and time pending'}</small>{a.note&&<p>{a.note}</p>}</article>)}</div>}</section>}
      <section className="payment-layout"><div className="payment-card"><h2>Account details</h2><p><strong>Phone:</strong> {user.phone || 'Not set'}</p><p><strong>Country:</strong> {profile?.country || 'Not set'}</p><p><strong>City:</strong> {profile?.city || 'Not set'}</p><p><strong>Account type:</strong> {profile?.role || 'actor'}</p><p><strong>Profile readiness:</strong> {profile?.profile_completed ?? 0}%</p>{!profilePictureUrl && !isProduction && <p className="muted">No profile picture uploaded yet. Add one while building your actor profile.</p>}</div><div className="payment-card"><h2>{isProduction ? 'Production workspace' : 'Platform services'}</h2><p className="muted">{isProduction ? 'Create and manage casting calls, review applicants, request services and contact customer care.' : 'Build your professional profile, request services, view auditions and track payment instructions from one account.'}</p><div className="actions">{isProduction ? <><a className="btn primary" href="/production/casting">Manage casting →</a><a className="btn secondary" href="/payments">Services & payments →</a><a className="btn secondary" href="/support">Chat with customer care →</a></> : <><a className="btn primary" href="/actors/register">Build / update actor profile →</a><a className="btn secondary" href="/payments">Services & payments →</a><a className="btn secondary" href="/support">Chat with customer care →</a></>}</div></div></section>
    </main>
  )
}
