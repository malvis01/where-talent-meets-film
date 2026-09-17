'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Audit = { id: string; admin_user_id: string; action: string; entity_type: string; entity_id: string | null; before_data: Record<string, unknown> | null; after_data: Record<string, unknown> | null; metadata: Record<string, unknown> | null; created_at: string }

export default function AdminAuditPage() {
  const [rows, setRows] = useState<Audit[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setMessage('Administrator session required.'); setLoading(false); return }
    const { data: isAdmin } = await supabase.rpc('is_admin', { uid: auth.user.id })
    if (!isAdmin) { setMessage('Administrator access required.'); setLoading(false); return }
    const { data, error } = await supabase.rpc('get_admin_audit_log', { p_limit: 200 })
    if (error) setMessage(error.message)
    setRows((data ?? []) as Audit[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  if (loading) return <main className="payment-page container"><p>Loading audit trail…</p></main>

  return <main className="payment-page container">
    <a className="back-link" href="/admin/dashboard">← Admin dashboard</a>
    <div className="payment-header"><div><div className="eyebrow">Golding&apos;s Production Company</div><h1>Administrator audit trail.</h1><p>Review recorded administrative actions, including commission withdrawal requests.</p></div></div>
    {message && <div className="info-box"><p>{message}</p></div>}
    <section className="payment-card">
      <h2>Recent activity</h2>
      {rows.length === 0 ? <p className="muted">No administrative activity has been recorded yet.</p> : <div className="admin-list">{rows.map((row) => <article key={row.id}>
        <strong>{row.action.replaceAll('_', ' ')}</strong>
        <span>{row.entity_type}{row.entity_id ? ` · ${row.entity_id}` : ''}</span>
        <small>{new Date(row.created_at).toLocaleString()} · Admin {row.admin_user_id}</small>
        {row.after_data && <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto', marginTop: 8 }}>{JSON.stringify(row.after_data, null, 2)}</pre>}
      </article>)}</div>}
    </section>
  </main>
}
