'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Conversation = { id: string; user_id: string; status: string; last_message_at: string; created_at: string; profile?: { display_name: string | null; phone: string | null; country: string | null } | null }
type Message = { id: string; sender_user_id: string; body: string; created_at: string }

export default function AdminSupportPage() {
  const [adminId, setAdminId] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadConversations() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setMessage('Administrator access required.'); setLoading(false); return }
    const { data: isAdmin } = await supabase.rpc('is_admin', { uid: auth.user.id })
    if (!isAdmin) { setMessage('Administrator access required.'); setLoading(false); return }
    setAdminId(auth.user.id)
    const { data, error } = await supabase.from('support_conversations').select('id,user_id,status,last_message_at,created_at').order('last_message_at', { ascending: false })
    if (error) { setMessage(error.message); setLoading(false); return }
    const rows = data ?? []
    const ids = rows.map((row) => row.user_id)
    let profiles: { id: string; display_name: string | null; phone: string | null; country: string | null }[] = []
    if (ids.length) {
      const result = await supabase.from('profiles').select('id,display_name,phone,country').in('id', ids)
      profiles = result.data ?? []
    }
    setConversations(rows.map((row) => ({ ...row, profile: profiles.find((p) => p.id === row.user_id) ?? null })))
    setLoading(false)
  }

  async function loadMessages(conversationId: string) {
    const { data, error } = await supabase.from('support_messages').select('id,sender_user_id,body,created_at').eq('conversation_id', conversationId).order('created_at')
    if (error) setMessage(error.message)
    setMessages(data ?? [])
  }

  useEffect(() => { void loadConversations() }, [])
  useEffect(() => {
    if (!selected) return
    void loadMessages(selected.id)
    const timer = window.setInterval(() => { void loadMessages(selected.id); void loadConversations() }, 5000)
    return () => window.clearInterval(timer)
  }, [selected?.id])

  async function reply(event: FormEvent) {
    event.preventDefault()
    if (!selected || !adminId || !body.trim()) return
    const { error } = await supabase.from('support_messages').insert({ conversation_id: selected.id, sender_user_id: adminId, body: body.trim() })
    if (error) setMessage(error.message)
    else { setBody(''); await loadMessages(selected.id); await loadConversations() }
  }

  async function closeConversation() {
    if (!selected) return
    await supabase.from('support_conversations').update({ status: 'closed' }).eq('id', selected.id)
    setSelected({ ...selected, status: 'closed' }); await loadConversations()
  }

  if (loading) return <main className="payment-page container"><p>Loading customer care…</p></main>
  if (!adminId) return <main className="payment-page container"><div className="payment-card"><h1>Administrator access required.</h1><p>{message}</p></div></main>

  return <main className="payment-page container"><a className="back-link" href="/admin/dashboard">← Admin dashboard</a><div className="payment-header"><div><div className="eyebrow">Customer care desk</div><h1>User conversations.</h1><p>Monitor every customer-care conversation and reply directly from the admin account.</p></div></div>{message && <div className="info-box"><p>{message}</p></div>}<section className="support-admin-layout"><div className="payment-card"><h2>Conversations</h2>{conversations.length === 0 ? <p className="muted">No customer conversations yet.</p> : conversations.map((conversation) => <button className={`support-conversation ${selected?.id === conversation.id ? 'selected' : ''}`} key={conversation.id} onClick={() => setSelected(conversation)}><strong>{conversation.profile?.display_name || 'User'}</strong><span>{conversation.profile?.phone || 'No phone'}{conversation.profile?.country ? ` · ${conversation.profile.country}` : ''}</span><small>{new Date(conversation.last_message_at).toLocaleString()} · {conversation.status}</small></button>)}</div><div className="payment-card"><h2>{selected ? `Chat: ${selected.profile?.display_name || 'User'}` : 'Select a conversation'}</h2>{selected ? <><div className="support-thread">{messages.map((item) => <div className={`support-message ${item.sender_user_id === adminId ? 'mine' : 'admin'}`} key={item.id}><div className="support-bubble"><strong>{item.sender_user_id === adminId ? 'You' : selected.profile?.display_name || 'User'}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString()}</small></div></div>)}</div><form onSubmit={reply} className="support-compose"><textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Reply to the user…" required /><div className="actions"><button className="btn primary" disabled={!body.trim()}>Reply →</button>{selected.status === 'open' && <button type="button" className="btn secondary" onClick={closeConversation}>Close conversation</button>}</div></form></> : <p className="muted">Choose a user conversation to read and respond.</p>}</div></section></main>
}
