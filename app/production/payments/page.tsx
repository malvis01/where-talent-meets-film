'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Request = {
  id:string; user_id:string; title:string; reason:string|null; amount:number; currency:string;
  local_amount:number|null; payment_method:string|null; payment_account_name:string|null;
  payment_account_number:string|null; payment_instructions:string|null; admin_payment_reference:string|null;
  status:string; created_at:string; commission_amount:number; recipient_amount:number;
  production_details_sent_at:string|null; completed_at:string|null
}
type Actor = { display_name:string|null; phone:string|null }

export default function ProductionPaymentDashboard(){
  const [requests,setRequests]=useState<Request[]>([])
  const [actors,setActors]=useState<Record<string,Actor>>({})
  const [allowed,setAllowed]=useState<boolean|null>(null)
  const [message,setMessage]=useState('')
  const [editing,setEditing]=useState<Record<string,Partial<Request>>>({})
  const [saving,setSaving]=useState<string|null>(null)

  async function load(){
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setAllowed(false);return}
    const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle()
    if(profile?.role!=='production'){setAllowed(false);return}
    setAllowed(true)
    const {data,error}=await supabase.from('payment_requests').select('*').eq('production_user_id',user.id).order('created_at',{ascending:false})
    if(error){setMessage(error.message);return}
    setRequests(data||[])
    const ids=(data||[]).map((r)=>r.user_id)
    if(ids.length){
      const {data:rows}=await supabase.from('profiles').select('id,display_name,phone').in('id',ids)
      const map:Record<string,Actor>={}
      ;(rows||[]).forEach((r)=>{map[r.id]={display_name:r.display_name,phone:r.phone}})
      setActors(map)
    }
  }
  useEffect(()=>{void load();const t=window.setInterval(()=>void load(),5000);return()=>window.clearInterval(t)},[])

  const edit=(id:string,key:keyof Request,value:string|number|null)=>setEditing(x=>({...x,[id]:{...x[id],[key]:value}}))

  async function save(r:Request,complete=false){
    const e=editing[r.id]||{}
    if(complete && !r.production_details_sent_at && !((e.payment_account_name??r.payment_account_name)||(e.payment_account_number??r.payment_account_number)||(e.payment_instructions??r.payment_instructions))) {
      setMessage('Provide the payment details before marking the transaction completed.');return
    }
    setSaving(r.id)
    const patch={
      local_amount:e.local_amount===undefined?r.local_amount:e.local_amount,
      currency:(e.currency??r.currency).trim().toUpperCase(),
      payment_method:e.payment_method===undefined?r.payment_method:e.payment_method,
      payment_account_name:e.payment_account_name===undefined?r.payment_account_name:e.payment_account_name,
      payment_account_number:e.payment_account_number===undefined?r.payment_account_number:e.payment_account_number,
      payment_instructions:e.payment_instructions===undefined?r.payment_instructions:e.payment_instructions,
      admin_payment_reference:e.admin_payment_reference===undefined?r.admin_payment_reference:e.admin_payment_reference,
      status:complete?'confirmed':(e.status??r.status),
      completed_by_production:complete ? (await supabase.auth.getUser()).data.user?.id : undefined
    }
    const {error}=await supabase.from('payment_requests').update(patch).eq('id',r.id).eq('production_user_id',(await supabase.auth.getUser()).data.user?.id)
    setSaving(null)
    if(error){setMessage(error.message);return}
    setMessage(complete?'Transaction completed. The 10% platform commission has been recorded.':'Payment details saved and sent to the actor.')
    setEditing(x=>({...x,[r.id]:{}}));await load()
  }

  if(allowed===null)return <main className="payment-page container"><p>Checking production access…</p></main>
  if(!allowed)return <main className="payment-page container"><a className="back-link" href="/">← Home</a><div className="info-box"><strong>Production access required</strong><p>Sign in with a production company account to open the payment dashboard.</p></div></main>

  return <main className="payment-page container"><a className="back-link" href="/account">← Account</a><div className="payment-header"><div><div className="eyebrow">Production company</div><h1>Payment dashboard.</h1><p>Review actor payment requests, manually provide payment details, and mark completed transactions. The platform records a 10% commission on each completed transaction.</p></div></div>{message&&<div className="info-box"><strong>Payment update</strong><p>{message}</p></div>}<div className="admin-list">{requests.length===0?<div className="payment-card"><p>No actor payment requests yet.</p></div>:requests.map(r=>{const e=editing[r.id]||{};const a=actors[r.user_id];return <article className="payment-card admin-request" key={r.id}><div className="request-title"><div><div className="eyebrow">{a?.display_name||'Actor'}</div><h2>{r.title}</h2><p className="muted">{a?.phone||''} · {new Date(r.created_at).toLocaleString()}</p><p>{r.reason||'No additional notes.'}</p></div><span className="status">{r.status}</span></div><div className="admin-grid"><label>Amount<input type="number" value={e.local_amount??r.local_amount??''} onChange={x=>edit(r.id,'local_amount',x.target.value?Number(x.target.value):null)} /></label><label>Currency<input value={e.currency??r.currency} onChange={x=>edit(r.id,'currency',x.target.value)} /></label><label>Payment method<input value={e.payment_method??r.payment_method??''} onChange={x=>edit(r.id,'payment_method',x.target.value)} placeholder="Bank transfer, card, cash..." /></label><label>Account name<input value={e.payment_account_name??r.payment_account_name??''} onChange={x=>edit(r.id,'payment_account_name',x.target.value)} /></label><label>Account / payment number<input value={e.payment_account_number??r.payment_account_number??''} onChange={x=>edit(r.id,'payment_account_number',x.target.value)} /></label><label>Payment reference<input value={e.admin_payment_reference??r.admin_payment_reference??''} onChange={x=>edit(r.id,'admin_payment_reference',x.target.value)} /></label><label className="full">Instructions<textarea rows={4} value={e.payment_instructions??r.payment_instructions??''} onChange={x=>edit(r.id,'payment_instructions',x.target.value)} placeholder="Tell the actor how the payment will be made or where to find the payment." /></label></div><div className="payment-instructions"><strong>Platform commission: 10%</strong><p>Commission: {r.currency} {Number(r.commission_amount||0).toLocaleString()} · Actor/recipient amount: {r.currency} {Number(r.recipient_amount||0).toLocaleString()}</p></div><div className="actions"><button className="btn primary" disabled={saving===r.id} onClick={()=>save(r)}>{saving===r.id?'Saving…':'Save & send details →'}</button>{r.status!=='confirmed'&&<button className="btn secondary" disabled={saving===r.id} onClick={()=>save(r,true)}>Mark transaction completed</button>}</div></article>})}</div></main>
}
