'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Request = { id: string; user_id: string; title: string; reason: string | null; amount: number; currency: string; local_amount: number | null; country_code: string | null; payment_method: string | null; payment_account_name: string | null; payment_account_number: string | null; payment_instructions: string | null; status: string; created_at: string; admin_payment_reference: string | null }
type Proof = { id: string; payment_request_id: string; storage_path: string; original_filename: string | null; created_at: string; url?: string }

export default function AdminPaymentsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [proofs, setProofs] = useState<Proof[]>([])
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<Record<string, Partial<Request>>>({})
  const [saving, setSaving] = useState<string | null>(null)

  async function load() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setAllowed(false); return }
    const { data: isAdmin } = await supabase.rpc('is_admin', { uid: auth.user.id })
    if (!isAdmin) { setAllowed(false); return }
    setAllowed(true)
    const [{ data, error }, { data: proofRows }] = await Promise.all([
      supabase.from('payment_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('payment_proofs').select('*').order('created_at', { ascending: false }),
    ])
    if (error) setMessage(error.message)
    else setRequests(data ?? [])
    const signed = await Promise.all((proofRows ?? []).map(async (proof) => {
      const { data: signedUrl } = await supabase.storage.from('payment-proofs').createSignedUrl(proof.storage_path, 900)
      return { ...proof, url: signedUrl?.signedUrl }
    }))
    setProofs(signed)
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => { void load() }, 5000)
    return () => window.clearInterval(timer)
  }, [])

  const edit = (id: string, key: keyof Request, value: string | number | null) => setEditing((current) => ({ ...current, [id]: { ...current[id], [key]: value } }))

  async function save(request: Request) {
    const patch = editing[request.id] ?? {}
    const paymentAccountName = patch.payment_account_name === undefined ? request.payment_account_name : patch.payment_account_name
    const paymentAccountNumber = patch.payment_account_number === undefined ? request.payment_account_number : patch.payment_account_number
    const paymentInstructions = patch.payment_instructions === undefined ? request.payment_instructions : patch.payment_instructions
    const adminPaymentReference = patch.admin_payment_reference === undefined ? request.admin_payment_reference : patch.admin_payment_reference
    const hasInstructions = Boolean(paymentAccountName?.trim() || paymentAccountNumber?.trim() || paymentInstructions?.trim() || adminPaymentReference?.trim())
    setSaving(request.id)

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setSaving(null); setMessage('Your admin session has expired. Please sign in again.'); return }

    const { data: updated, error } = await supabase.from('payment_requests').update({
      local_amount: patch.local_amount === undefined ? request.local_amount : patch.local_amount,
      currency: (patch.currency ?? request.currency)?.trim().toUpperCase(),
      payment_method: patch.payment_method === undefined ? request.payment_method : patch.payment_method,
      payment_account_name: paymentAccountName,
      payment_account_number: paymentAccountNumber,
      payment_instructions: paymentInstructions,
      admin_payment_reference: adminPaymentReference,
      created_by_admin: auth.user.id,
      status: patch.status ?? (hasInstructions ? 'confirmed' : request.status),
      confirmed_by: hasInstructions ? auth.user.id : null,
      confirmed_at: hasInstructions ? new Date().toISOString() : null,
    }).eq('id', request.id).select('*').single()

    setSaving(null)
    if (error) {
      setMessage(`Could not send payment instructions: ${error.message}`)
      return
    }
    if (!updated) {
      setMessage('Payment details were not saved. Please try again.')
      return
    }
    setEditing((current) => ({ ...current, [request.id]: {} }))
    setMessage('Payment instructions saved and sent to the user. They will appear on the user payment page automatically.')
    await load()
  }

  if (allowed === null) return <main className="payment-page container"><p>Checking administrator access…</p></main>
  if (!allowed) return <main className="payment-page container"><a className="back-link" href="/">← Home</a><div className="info-box"><strong>Administrator access required</strong><p>Sign in with an account that has the admin role before opening the payment desk.</p></div></main>

  return <main className="payment-page container"><a className="back-link" href="/">← Where Talent Meets Film</a><div className="payment-header"><div><div className="eyebrow">Administrator</div><h1>Payment service desk.</h1><p>Review service requests, set the user's applicable local amount and payment account, review proof files, and confirm or reject payments.</p></div><a className="btn secondary" href="/payments">User payment page</a></div>{message && <div className="info-box"><strong>Admin update</strong><p>{message}</p></div>}<div className="admin-list">{requests.length === 0 ? <div className="payment-card"><p>No payment requests yet.</p></div> : requests.map((r) => { const e = editing[r.id] ?? {}; const requestProofs = proofs.filter((p) => p.payment_request_id === r.id); return <article className="payment-card admin-request" key={r.id}><div className="request-title"><div><div className="eyebrow">{r.country_code || 'Country not supplied'}</div><h2>{r.title}</h2><p className="muted">User: {r.user_id}</p><p className="muted">Reference: {r.currency} {Number(r.amount).toLocaleString()} · {new Date(r.created_at).toLocaleString()}</p>{r.reason && <p>{r.reason}</p>}</div><span className="status">{r.status}</span></div><div className="admin-grid"><label>Local amount<input type="number" value={e.local_amount ?? r.local_amount ?? ''} onChange={(x) => edit(r.id, 'local_amount', x.target.value ? Number(x.target.value) : null)} placeholder="Amount in user's currency" /></label><label>Currency<input value={e.currency ?? r.currency ?? ''} onChange={(x) => edit(r.id, 'currency', x.target.value.toUpperCase())} placeholder="NGN, GBP, CAD…" /></label><label>Payment method<input value={e.payment_method ?? r.payment_method ?? ''} onChange={(x) => edit(r.id, 'payment_method', x.target.value)} placeholder="Bank transfer, card, etc." /></label><label>Account name<input value={e.payment_account_name ?? r.payment_account_name ?? ''} onChange={(x) => edit(r.id, 'payment_account_name', x.target.value)} /></label><label>Account / payment number<input value={e.payment_account_number ?? r.payment_account_number ?? ''} onChange={(x) => edit(r.id, 'payment_account_number', x.target.value)} /></label><label>Reference<input value={e.admin_payment_reference ?? r.admin_payment_reference ?? ''} onChange={(x) => edit(r.id, 'admin_payment_reference', x.target.value)} /></label><label className="full">Payment instructions<textarea rows={4} value={e.payment_instructions ?? r.payment_instructions ?? ''} onChange={(x) => edit(r.id, 'payment_instructions', x.target.value)} placeholder="Give clear instructions for the user's country and selected payment method." /></label><label>Status<select value={e.status ?? r.status} onChange={(x) => edit(r.id, 'status', x.target.value)}><option value="pending">Pending</option><option value="proof_submitted">Proof submitted</option><option value="confirmed">Confirmed</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></select></label></div>{requestProofs.length > 0 && <div className="payment-instructions"><strong>Payment proofs</strong>{requestProofs.map((p) => <p key={p.id}>{p.original_filename || 'Proof file'} · {new Date(p.created_at).toLocaleString()} {p.url && <a href={p.url} target="_blank" rel="noreferrer">Open proof</a>}</p>)}</div>}<button className="btn primary" disabled={saving === r.id} onClick={() => save(r)}>{saving === r.id ? 'Sending…' : 'Send payment instructions to user →'}</button></article>})}</div></main>
}
