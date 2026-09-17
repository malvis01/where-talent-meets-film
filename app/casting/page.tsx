'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function CastingPage() {
  const [calls, setCalls] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [applied, setApplied] = useState<string[]>([])
  const [isActor, setIsActor] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    const { data, error } = await supabase
      .from('casting_calls')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (error) setMessage(error.message)
    setCalls(data || [])

    if (user) {
      const [{ data: actor }, { data: applications }] = await Promise.all([
        supabase.from('actor_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
        supabase.from('applications').select('casting_call_id').eq('actor_user_id', user.id),
      ])
      setIsActor(Boolean(actor))
      setApplied((applications || []).map((item) => item.casting_call_id))
    } else {
      setIsActor(false)
      setApplied([])
    }

    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function apply(id: string) {
    setMessage('')
    if (!user) {
      setMessage('Please sign in before applying.')
      return
    }
    if (!isActor) {
      setMessage('You need an actor profile before you can apply for casting calls.')
      return
    }

    setApplying(id)
    const { error } = await supabase
      .from('applications')
      .insert({ casting_call_id: id, actor_user_id: user.id, status: 'applied' })

    if (error) {
      if (error.code === '23505') setMessage('You have already applied for this casting call.')
      else setMessage(error.message)
    } else {
      setMessage('Application submitted successfully. The production team can now review your profile.')
      await load()
    }
    setApplying(null)
  }

  return (
    <main className="payment-page container">
      <a className="back-link" href="/">← Where Talent Meets Film</a>
      <div className="payment-header">
        <div>
          <div className="eyebrow">Open opportunities</div>
          <h1>Casting calls.</h1>
          <p>Explore active roles and apply directly to production teams.</p>
        </div>
        <div className="actions">
          <a className="btn secondary" href="/account">My account</a>
          <a className="btn secondary" href="/notifications">Notifications</a>
        </div>
      </div>

      {message && <div className="info-box" role="status"><p>{message}</p></div>}

      {user && !isActor && !loading && (
        <div className="info-box">
          <strong>Complete your actor profile first.</strong>
          <p>Your casting applications are connected to your actor profile so production teams can review your information.</p>
          <a className="btn primary" href="/actors/register">Build actor profile →</a>
        </div>
      )}

      <div className="payment-layout">
        <section>
          {loading ? (
            <div className="payment-card"><p>Loading casting calls…</p></div>
          ) : calls.length === 0 ? (
            <div className="payment-card">
              <h2>No open casting calls yet.</h2>
              <p className="muted">Production teams can publish opportunities here as they become available.</p>
            </div>
          ) : calls.map((call) => (
            <article className="payment-card" key={call.id}>
              <div className="eyebrow">{call.city}, {call.country}</div>
              <h2>{call.title}</h2>
              <p><strong>{call.project_name}</strong> · {call.role_name}</p>
              <p>{call.description}</p>
              <div className="tags">
                {(call.skills || []).map((skill: string) => <span className="tag" key={`skill-${skill}`}>{skill}</span>)}
                {(call.languages || []).map((language: string) => <span className="tag" key={`language-${language}`}>{language}</span>)}
              </div>
              <p className="muted">
                Experience: {call.experience_level}
                {call.age_min || call.age_max ? ` · Age ${call.age_min || '18'}–${call.age_max || '+'}` : ''}
              </p>
              {call.audition_requirement && (
                <div className="info-box">
                  <strong>Audition</strong>
                  <p>{call.audition_requirement}</p>
                </div>
              )}
              <button
                className="btn primary"
                disabled={applied.includes(call.id) || applying === call.id || !isActor}
                onClick={() => apply(call.id)}
              >
                {applied.includes(call.id) ? 'Application submitted' : applying === call.id ? 'Submitting…' : 'Apply for this role →'}
              </button>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
