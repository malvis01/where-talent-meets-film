'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Request = { id: string; user_id: string; title: string; reason: string | null; amount: number; currency: string; local_amount: number | null; country_code: string | null; payment_method: string | null; payment_account_name: string | null; payment_account_number: string | null; payment_instructions: string | null; status: string; created_at: string; admin_payment_reference: string | null }

export default function AdminPaymentsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<Record<string, Partial<Request>>>({})

  async function load() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setAllowed(false); return }
    const { data: isAdmin } = await supabase.rpc('is_admin', { uid: auth.user.id })
    if (!isAdmin) { setAllowed(false); return }
    setAllowed(true)
    const { data, error } = await supabase.from('payment_requests').select('*').order('created_at', { ascending: false })
    if (error) setMessage(error.message)
    else setRequests(data ?? [])
  }

  useEffect(() => { void load() }, [])

  const edit = (id: string, key: keyof Request, value: string | number | null) => setEditing((current) => ({ ...current, [id]: { ...current[id], [key]: value } }))

  async function save(request: Request) {
    const patch = editing[request.id] ?? {}
    const { error } = await supabase.from('payment_requests').update({
      local_amount: patch.local_amount === undefined ? request.local_amount : patch.local_amount,
      currency: patch.currency ?? request.currency,
      payment_method: patch.payment_method ?? request.payment_method,
      payment_account_name: patch.payment_account_name ?? request.payment_account_name,
      payment_account_number: patch.payment_account_number ?? request.payment_account_number,
      payment_instructions: patch.payment_instructions ?? request.payment_instructions,
      admin_payment_reference: patch.admin_payment_reference ?? request.admin_payment_reference,
      status: patch.status ?? request.status,
      rejection_reason: patch.status === 'rejected' ? (patch.payment_instructions ?? request.payment_instructions) : undefined,
    }).eq('id', request.id)
    if (error) setMessage(error.message)
    else { setMessage('Payment request updated.'); await load() }
  }

  if (allowed === null) return <main className="payment-page container"><p>Checking administrator access…</p></main>
  if (!allowed) return <main className="payment-page container"><a className="back-link" href="/">← Home</a><div className="info-box"><strong>Administrator access required</strong><p>Sign in with an account that has the admin role before opening the payment desk.</p></div></main>

  return <main className="payment-page container"><a className="back-link" href="/">← Where Talent Meets Film</a><div className="payment-header"><div><div className="eyebrow">Administrator</div><h1>Payment service desk.</h1><p>Review service requests, set the user's applicable local amount and payment account, then confirm payment proofs through Supabase.</p></div><a className="btn secondary" href="/payments">User payment page</a></div>{message && <div className="info-box"><strong>Admin update</strong><p>{message}</p></div>}<div className="admin-list">{requests.length === 0 ? <div className="payment-card"><p>No payment requests yet.</p></div> : requests.map((r) => { const e = editing[r.id] ?? {}; return <article className="payment-card admin-request" key={r.id}><div className="request-title"><div><div className="eyebrow">{r.country_code || 'Country not supplied'}</div><h2>{r.title}</h2><p className="muted">User: {r.user_id}</p><p className="muted">Reference: {r.currency} {Number(r.amount).toLocaleString()} · {new Date(r.created_at).toLocaleString()}</p>{r.reason && <p>{r.reason}</p>}</div><span className="status">{r.status}</span></div><div className="admin-grid"><label>Local amount<input type="number" value={e.local_amount ?? r.local_amount ?? ''} onChange={(x) => edit(r.id, 'local_amount', x.target.value ? Number(x.target.value) : null)} placeholder="Amount in user's currency" /></label><label>Currency<input value={e.currency ?? r.currency ?? ''} onChange={(x) => edit(r.id, 'currency', x.target.value.toUpperCase())} placeholder="NGN, GBP, CAD…" /></label><label>Payment method<input value={e.payment_method ?? r.payment_method ?? ''} onChange={(x) => edit(r.id, 'payment_method', x.target.value)} placeholder="Bank transfer, card, etc." /></label><label>Account name<input value={e.payment_account_name ?? r.payment_account_name ?? ''} onChange={(x) => edit(r.id, 'payment_account_name', x.target.value)} /></label><label>Account / payment number<input value={e.payment_account_number ?? r.payment_account_number ?? ''} onChange={(x) => edit(r.id, 'payment_account_number', x.target.value)} /></label><label>Reference<input value={e.admin_payment_reference ?? r.admin_payment_reference ?? ''} onChange={(x) => edit(r.id, 'admin_payment_reference', x.target.value)} /></label><label className="full">Payment instructions<textarea rows={4} value={e.payment_instructions ?? r.payment_instructions ?? ''} onChange={(x) => edit(r.id, 'payment_instructions', x.target.value)} placeholder="Give clear instructions for the user's country and selected payment method." /></label><label>Status<select value={e.status ?? r.status} onChange={(x) => edit(r.id, 'status', x.target.value)}><option value="pending">Pending</option><option value="proof_submitted">Proof submitted</option><option value="confirmed">Confirmed</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></select></label></div><button className="btn primary" onClick={() => save(r)}>Save payment instructions</button></article>})}</div></main>
}
