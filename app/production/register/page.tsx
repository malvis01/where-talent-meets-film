'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authenticateWithPhone, normalizePhone } from '@/lib/phone-auth'
import { supabase } from '@/lib/supabase'

export default function ProductionRegisterPage() {
  const router = useRouter()
  const [form,setForm]=useState({name:'',phone:'',password:'',company:'',type:'Production company',website:'',description:'',country:'',region:'',city:''})
  const [error,setError]=useState(''); const [saving,setSaving]=useState(false)
  const update=(k:string,v:string)=>setForm(f=>({...f,[k]:v}))
  async function submit(e:FormEvent){e.preventDefault();setError('');setSaving(true)
    try {
      const phone=normalizePhone(form.phone)
      if(!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Enter your phone number in international format, for example +2348012345678.')
      const {user}=await authenticateWithPhone(phone,form.password,'signup',form.name)
      const {error:profileError}=await supabase.from('profiles').update({display_name:form.name.trim(),phone,country:form.country.trim(),region:form.region.trim(),city:form.city.trim()}).eq('id',user.id)
      if(profileError) throw profileError
      const {error:roleError}=await supabase.rpc('request_production_role')
      if(roleError) throw new Error('Your account was created, but production access could not be enabled. Please contact support.')
      const {error:companyError}=await supabase.from('production_profiles').upsert({user_id:user.id,company_name:form.company.trim(),company_type:form.type,website:form.website.trim()||null,description:form.description.trim()||null,verification_status:'pending'})
      if(companyError) throw companyError
      router.push('/production/casting')
    } catch(err){setError(err instanceof Error?err.message:'Could not create production account.')} finally{setSaving(false)}
  }
  return <main className="payment-page container"><a className="back-link" href="/">← Where Talent Meets Film</a><div className="payment-card auth-card"><div className="eyebrow">Production account</div><h1>Build your production profile.</h1><p className="muted">Create a production account to publish casting calls, review applications and manage auditions.</p><form onSubmit={submit}><div className="form-grid"><label>Your name<input required value={form.name} onChange={e=>update('name',e.target.value)}/></label><label>Phone number<input required type="tel" value={form.phone} onChange={e=>update('phone',e.target.value)} placeholder="+2348012345678"/></label><label>Password<input required type="password" minLength={8} value={form.password} onChange={e=>update('password',e.target.value)}/></label><label>Company / production name<input required value={form.company} onChange={e=>update('company',e.target.value)}/></label><label>Company type<select value={form.type} onChange={e=>update('type',e.target.value)}><option>Production company</option><option>Film director</option><option>Producer</option><option>Casting director</option><option>Talent agency</option></select></label><label>Website <small>Optional</small><input value={form.website} onChange={e=>update('website',e.target.value)} placeholder="https://..."/></label><label>Country<input required value={form.country} onChange={e=>update('country',e.target.value)}/></label><label>Region / state<input value={form.region} onChange={e=>update('region',e.target.value)}/></label><label>City<input required value={form.city} onChange={e=>update('city',e.target.value)}/></label><label className="full">About your production work<textarea rows={5} value={form.description} onChange={e=>update('description',e.target.value)} placeholder="Tell actors what your company produces and the kind of projects you work on."/></label></div>{error&&<div className="info-box" role="alert"><p>{error}</p></div>}<button className="btn primary" disabled={saving}>{saving?'Creating production account…':'Create production account →'}</button></form></div></main>
}
