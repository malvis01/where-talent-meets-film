'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Message = { id: string; sender_user_id: string; body: string; created_at: string; read_at: string | null }
type Conversation = { id: string; status: string; created_at: string }

export default function SupportPage() {
  const [userId, setUserId] = useState('')
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setMessage('Please sign in to contact customer care.'); setLoading(false); return }
    setUserId(auth.user.id)
    let { data: conv } = await supabase.from('support_conversations').select('id,status,created_at').eq('user_id', auth.user.id).maybeSingle()
    if (!conv) {
      const created = await supabase.from('support_conversations').insert({ user_id: auth.user.id }).select('id,status,created_at').single()
      if (created.error) { setMessage(created.error.message); setLoading(false); return }
      conv = created.data
    }
    setConversation(conv)
    const { data: msgs, error } = await supabase.from('support_messages').select('id,sender_user_id,body,created_at,read_at').eq('conversation_id', conv.id).order('created_at')
    if (error) setMessage(error.message)
    setMessages(msgs ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (!conversation) return
    const timer = window.setInterval(() => { void load() }, 5000)
    return () => window.clearInterval(timer)
  }, [conversation?.id])

  async function send(event: FormEvent) {
    event.preventDefault()
    if (!userId || !conversation || conversation.status === 'closed' || !body.trim() || sending) return
    setSending(true)
    setMessage('')
    const { error } = await supabase.from('support_messages').insert({ conversation_id: conversation.id, sender_user_id: userId, body: body.trim() })
    if (error) setMessage(error.message)
    else { setBody(''); await load() }
    setSending(false)
  }

  if (loading) return <main className="payment-page container"><div className="payment-card"><p>Loading customer care…</p></div></main>
  if (!userId) return <main className="payment-page container"><a className="back-link" href="/account">← Account</a><div className="payment-card"><div className="eyebrow">Customer care</div><h1>Chat with our admin.</h1><p className="muted">Sign in to send a private support message to the platform administrator.</p>{message && <div className="info-box"><p>{message}</p></div>}<a className="btn primary" href="/login">Sign in →</a></div></main>

  const closed = conversation?.status === 'closed'
  return <main className="payment-page container"><a className="back-link" href="/account">← My account</a><div className="payment-header"><div><div className="eyebrow">Customer care</div><h1>Chat with admin.</h1><p>Ask about your account, services, payments, casting or anything you need help with.</p></div><span className="status">{closed ? 'Closed' : 'Open'}</span></div>{message && <div className="info-box"><p>{message}</p></div>}<section className="payment-card"><div className="support-thread">{messages.length === 0 ? <p className="muted">No messages yet. Send your first message below.</p> : messages.map((item) => <div className={`support-message ${item.sender_user_id === userId ? 'mine' : 'admin'}`} key={item.id}><div className="support-bubble"><strong>{item.sender_user_id === userId ? 'You' : 'Admin customer care'}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString()}</small></div></div>)}</div>{closed ? <div className="info-box"><strong>This conversation is closed.</strong><p>Please contact customer care again if you need further help.</p></div> : <form onSubmit={send} className="support-compose"><textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message to customer care…" required /><button className="btn primary" disabled={sending || !body.trim()}>{sending ? 'Sending…' : 'Send message →'}</button></form>}</section></main>
}
