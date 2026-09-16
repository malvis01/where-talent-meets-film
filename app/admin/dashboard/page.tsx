'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Summary = { total_held: number; total_withdrawn: number; total_requested: number; available: number }
type User = { id: string; display_name: string | null; phone: string | null; country: string | null; role: string; status: string; created_at: string; last_seen_at: string | null }
type Payment = { id: string; title: string; amount: number; currency: string; local_amount: number | null; commission_amount: number; recipient_amount: number; commission_held: boolean; status: string; created_at: string; user_id: string }
type Account = { id: string; country: string; currency: string; account_name: string; bank_name: string; account_number: string | null; iban: string | null; swift_bic: string | null; routing_number: string | null; branch_code: string | null; other_details: string | null; is_default: boolean }
type Withdrawal = { id: string; amount: number; currency: string; status: string; requested_at: string; note: string | null }

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [country, setCountry] = useState('')
  const [accountName, setAccountName] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [iban, setIban] = useState('')
  const [swift, setSwift] = useState('')
  const [routing, setRouting] = useState('')
  const [branch, setBranch] = useState('')
  const [other, setOther] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setMessage('Administrator access required.'); setLoading(false); return }
    const { data: isAdmin } = await supabase.rpc('is_admin', { uid: auth.user.id })
    if (!isAdmin) { setMessage('Administrator access required.'); setLoading(false); return }
    const [u, p, s, a, w] = await Promise.all([
      supabase.from('profiles').select('id,display_name,phone,country,role,status,created_at,last_seen_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('payment_requests').select('id,title,amount,currency,local_amount,commission_amount,recipient_amount,commission_held,status,created_at,user_id').order('created_at', { ascending: false }).limit(100),
      supabase.rpc('get_commission_summary'),
      supabase.from('admin_payout_accounts').select('*').order('is_default', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('commission_withdrawals').select('id,amount,currency,status,requested_at,note').order('requested_at', { ascending: false }).limit(30),
    ])
    if (u.error || p.error || s.error || a.error || w.error) setMessage(u.error?.message || p.error?.message || s.error?.message || a.error?.message || w.error?.message || 'Could not load dashboard.')
    setUsers(u.data ?? []); setPayments(p.data ?? []); setSummary((s.data?.[0] ?? null) as Summary | null); setAccounts(a.data ?? []); setWithdrawals(w.data ?? [])
    if (!selectedAccount && a.data?.[0]) setSelectedAccount(a.data[0].id)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function addAccount() {
    if (!country || !currency || !accountName || !bankName) { setMessage('Country, currency, account name and bank name are required.'); return }
    const { error } = await supabase.from('admin_payout_accounts').insert({ country, currency: currency.toUpperCase(), account_name: accountName, bank_name: bankName, account_number: accountNumber || null, iban: iban || null, swift_bic: swift || null, routing_number: routing || null, branch_code: branch || null, other_details: other || null })
    if (error) setMessage(error.message)
    else { setMessage('Withdrawal account saved.'); setCountry(''); setAccountName(''); setBankName(''); setAccountNumber(''); setIban(''); setSwift(''); setRouting(''); setBranch(''); setOther(''); await load() }
  }

  async function requestWithdrawal() {
    const selected = accounts.find((account) => account.id === selectedAccount)
    const value = Number(amount)
    if (!selected || !value || value <= 0) { setMessage('Select a payout account and enter a valid withdrawal amount.'); return }
    if (summary && value > Number(summary.available)) { setMessage('Withdrawal exceeds the currently available commission balance.'); return }
    const { error } = await supabase.from('commission_withdrawals').insert({ payout_account_id: selected.id, amount: value, currency: currency.toUpperCase(), account_snapshot: selected, status: 'requested' })
    if (error) setMessage(error.message)
    else { setMessage('Commission withdrawal recorded.'); setAmount(''); await load() }
  }

  if (loading) return <main className="payment-page container"><p>Loading admin dashboard…</p></main>
  if (!summary) return <main className="payment-page container"><div className="payment-card"><h1>Administrator access required.</h1><p>{message}</p></div></main>

  const confirmedPayments = payments.filter((p) => p.commission_held)
  const recentUsers = users.slice(0, 10)

  return <main className="payment-page container"><a className="back-link" href="/admin/login">← Admin access</a><div className="payment-header"><div><div className="eyebrow">Golding&apos;s Production Company</div><h1>Platform control centre.</h1><p>Monitor users, customer care, service payments, platform commission and withdrawals.</p></div><div className="actions"><a className="btn secondary" href="/admin/support">Customer care</a><a className="btn secondary" href="/admin/payments">Payment desk</a></div></div>{message && <div className="info-box"><p>{message}</p></div>}<section className="stats-grid"><div className="stat-card"><span>Total users</span><strong>{users.length}</strong></div><div className="stat-card"><span>Commission held</span><strong>{Number(summary.total_held).toLocaleString()}</strong></div><div className="stat-card"><span>Withdrawn</span><strong>{Number(summary.total_withdrawn).toLocaleString()}</strong></div><div className="stat-card"><span>Available commission</span><strong>{Number(summary.available).toLocaleString()}</strong></div></section><section className="payment-layout"><div className="payment-card"><h2>New / recent users</h2>{recentUsers.length === 0 ? <p className="muted">No users yet.</p> : <div className="admin-list">{recentUsers.map((u) => <article key={u.id}><strong>{u.display_name || 'Unnamed user'}</strong><span>{u.phone || 'No phone'} · {u.country || 'Country not set'}</span><small>Joined {new Date(u.created_at).toLocaleString()} · {u.role} · {u.status}</small></article>)}</div>}</div><div className="payment-card"><h2>Commission ledger</h2>{confirmedPayments.length === 0 ? <p className="muted">No confirmed commission yet.</p> : <div className="admin-list">{confirmedPayments.slice(0, 10).map((p) => <article key={p.id}><strong>{p.title}</strong><span>Gross: {p.currency} {Number(p.local_amount ?? p.amount).toLocaleString()} · 10%: {p.currency} {Number(p.commission_amount).toLocaleString()}</span><small>Recipient amount: {p.currency} {Number(p.recipient_amount).toLocaleString()} · {p.status}</small></article>)}</div>}</div></section><section className="payment-card"><h2>Admin withdrawal accounts</h2><p className="muted">Store payout details for any country/currency. These details are only visible to the administrator.</p><div className="admin-list">{accounts.map((a) => <article key={a.id}><strong>{a.account_name} · {a.bank_name}</strong><span>{a.country} · {a.currency} · {a.account_number || a.iban || 'Bank details stored'}</span><small>{a.swift_bic ? `SWIFT/BIC: ${a.swift_bic}` : ''}{a.is_default ? ' · Default' : ''}</small></article>)}</div><div className="form-grid"><label>Country<input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Nigeria" /></label><label>Currency<input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="NGN" /></label><label>Account name<input value={accountName} onChange={(e) => setAccountName(e.target.value)} /></label><label>Bank name<input value={bankName} onChange={(e) => setBankName(e.target.value)} /></label><label>Account number<input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></label><label>IBAN <small>Optional</small><input value={iban} onChange={(e) => setIban(e.target.value)} /></label><label>SWIFT/BIC <small>Optional</small><input value={swift} onChange={(e) => setSwift(e.target.value)} /></label><label>Routing number <small>Optional</small><input value={routing} onChange={(e) => setRouting(e.target.value)} /></label><label>Branch code <small>Optional</small><input value={branch} onChange={(e) => setBranch(e.target.value)} /></label><label className="full">Other details <small>Optional</small><textarea rows={3} value={other} onChange={(e) => setOther(e.target.value)} /></label></div><button className="btn primary" onClick={addAccount}>Save withdrawal account →</button></section><section className="payment-layout"><div className="payment-card"><h2>Withdraw platform commission</h2><p className="muted">A withdrawal is recorded against the available commission balance and keeps a snapshot of the selected payout account.</p><label>Withdrawal account<select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name} · {a.country} · {a.currency}</option>)}</select></label><label>Amount<input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" /></label><label>Currency<input value={currency} onChange={(e) => setCurrency(e.target.value)} /></label><button className="btn primary" onClick={requestWithdrawal}>Record withdrawal →</button></div><div className="payment-card"><h2>Withdrawal history</h2>{withdrawals.length === 0 ? <p className="muted">No withdrawals recorded.</p> : <div className="admin-list">{withdrawals.map((w) => <article key={w.id}><strong>{w.currency} {Number(w.amount).toLocaleString()}</strong><span>{w.status}</span><small>{new Date(w.requested_at).toLocaleString()}</small></article>)}</div>}</div></section></main>
}
