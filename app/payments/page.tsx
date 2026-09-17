'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Category = { id: string; name: string; description: string | null; pricing_type: string; base_amount_usd: number | null; commission_min_percent: number | null; commission_max_percent: number | null }
type Request = { id: string; title: string; reason: string | null; amount: number; currency: string; local_amount: number | null; country_code: string | null; payment_method: string | null; payment_account_name: string | null; payment_account_number: string | null; payment_instructions: string | null; status: string; created_at: string; admin_payment_reference: string | null; service_category_id: string | null }

export default function PaymentsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [country, setCountry] = useState('')
  const [reason, setReason] = useState('')
  const [variableAmount, setVariableAmount] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({})

  async function load(showLoading = true) {
    if (showLoading) setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setMessage('Please sign in before requesting a service payment.'); setLoading(false); return }
    setUserId(auth.user.id)
    const [{ data: cats, error: categoryError }, { data: reqs, error: requestError }] = await Promise.all([
      supabase.from('service_payment_categories').select('*').eq('active', true).order('name'),
      supabase.from('payment_requests').select('*').eq('user_id', auth.user.id).order('created_at', { ascending: false }),
    ])
    if (categoryError || requestError) setMessage(categoryError?.message || requestError?.message || 'Could not load payment data.')
    setCategories(cats ?? [])
    setRequests(reqs ?? [])
    if (!categoryId && cats?.[0]) setCategoryId(cats[0].id)
    setLoading(false)
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => { void load(false) }, 5000)
    return () => window.clearInterval(timer)
  }, [])

  const selected = categories.find((c) => c.id === categoryId)
  const needsAmount = selected?.pricing_type !== 'fixed'

  async function submitRequest() {
    if (!userId || !selected) return
    const amount = selected.pricing_type === 'fixed' ? selected.base_amount_usd : Number(variableAmount)
    if (!amount || amount <= 0) { setMessage('Enter the amount applicable to your request.'); return }
    if (!country.trim()) { setMessage('Enter your country so the admin can provide the correct local payment instructions.'); return }
    const { error } = await supabase.from('payment_requests').insert({ user_id: userId, title: selected.name, reason: reason.trim() || null, amount, currency: 'USD', service_category_id: selected.id, base_amount_usd: selected.base_amount_usd, country_code: country.trim().toUpperCase(), currency_source: 'admin_set' })
    if (error) setMessage(error.message)
    else { setMessage('Service payment request submitted. The admin will review it and provide the applicable local payment account and amount.'); setReason(''); setVariableAmount(''); await load(false) }
  }

  async function uploadProof(requestId: string) {
    const file = proofFiles[requestId]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setMessage('Payment proof must be 10 MB or smaller.'); return }
    const path = `${userId}/${requestId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const upload = await supabase.storage.from('payment-proofs').upload(path, file, { upsert: false })
    if (upload.error) { setMessage(upload.error.message); return }

    const { error } = await supabase.rpc('submit_payment_proof', {
      p_request_id: requestId,
      p_storage_path: path,
      p_original_filename: file.name,
      p_mime_type: file.type || null,
    })
    if (error) {
      await supabase.storage.from('payment-proofs').remove([path])
      setMessage(error.message)
      return
    }
    setMessage('Payment proof submitted. The admin can now review it and confirm or reject the payment.')
    setProofFiles((current) => ({ ...current, [requestId]: null }))
    await load(false)
  }

  if (loading) return <main className="payment-page container"><p>Loading payment services…</p></main>
  if (!userId) return <main className="payment-page container"><a className="back-link" href="/">← Where Talent Meets Film</a><div className="payment-card"><div className="eyebrow">Services & payments</div><h1>Sign in to continue.</h1><p className="muted">Create or sign in to an account before requesting a service or submitting payment proof.</p><div className="actions"><a className="btn primary" href="/login">Sign in / Create account →</a><a className="btn secondary" href="/">Back home</a></div></div></main>

  return <main className="payment-page container"><a className="back-link" href="/">← Where Talent Meets Film</a><div className="payment-header"><div><div className="eyebrow">Services & payments</div><h1>Request a service.</h1><p>Choose what you need. The platform keeps a reference value in USD, while the administrator supplies the applicable local currency and payment account for your country.</p></div></div>{message && <div className="info-box"><strong>Payment update</strong><p>{message}</p></div>}<section className="payment-layout"><div className="payment-card"><h2>New service request</h2><label>Service<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{selected && <div className="price-box"><strong>{selected.pricing_type === 'fixed' ? `$${Number(selected.base_amount_usd).toLocaleString()} USD reference` : selected.pricing_type === 'commission' ? `${selected.commission_min_percent}%–${selected.commission_max_percent}% commission` : 'Admin-set amount'}</strong><span>{selected.description}</span></div>}{needsAmount && <label>Requested amount / earnings basis<input type="number" min="0" value={variableAmount} onChange={(e) => setVariableAmount(e.target.value)} placeholder="Enter amount" /></label>}<label>Your country<input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Nigeria, United Kingdom, Canada" /></label><label>Reason / notes <small>Optional</small><textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell the admin what you need this service for." /></label><button className="btn primary" onClick={submitRequest}>Request payment instructions →</button></div><div className="payment-card"><h2>My requests</h2>{requests.length === 0 ? <p className="muted">No payment requests yet.</p> : requests.map((r) => { const hasPaymentDetails = Boolean(r.payment_account_name?.trim() || r.payment_account_number?.trim() || r.payment_method?.trim() || r.payment_instructions?.trim() || r.admin_payment_reference?.trim() || r.local_amount); const canSubmitProof = ['pending','confirmed','proof_submitted'].includes(r.status) && hasPaymentDetails; return <article className="request-item" key={r.id}><div><strong>{r.title}</strong><span className="status">{r.status}</span></div><p>{r.local_amount ? `${r.currency} ${Number(r.local_amount).toLocaleString()}` : `${r.currency} ${Number(r.amount).toLocaleString()} reference`}</p>{hasPaymentDetails && <div className="payment-instructions"><strong>Payment instructions from admin</strong>{r.local_amount && <p>Amount to pay: {r.currency} {Number(r.local_amount).toLocaleString()}</p>}{r.payment_account_name && <p>Account name: {r.payment_account_name}</p>}{r.payment_account_number && <p>Account / payment number: {r.payment_account_number}</p>}{r.payment_method && <p>Method: {r.payment_method}</p>}{r.payment_instructions && <p>{r.payment_instructions}</p>}{r.admin_payment_reference && <p>Reference: {r.admin_payment_reference}</p>}</div>}{hasPaymentDetails && <p className="muted">Admin has sent the payment instructions. Follow the instructions above, then submit your proof below.</p>}{canSubmitProof && <div className="proof-upload"><input type="file" accept="image/*,.pdf" onChange={(e) => setProofFiles((current) => ({ ...current, [r.id]: e.target.files?.[0] ?? null }))} /><button className="btn secondary" disabled={!proofFiles[r.id]} onClick={() => uploadProof(r.id)}>Submit proof</button></div>}</article>})}</div></section></main>
}
