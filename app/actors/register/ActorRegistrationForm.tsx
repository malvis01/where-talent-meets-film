'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authenticateWithPhone, normalizePhone } from '@/lib/phone-auth'
import { supabase } from '@/lib/supabase'

const steps = ['Account', 'Profile', 'Skills', 'Media & training', 'Availability']
const skills = ['Dancing', 'Singing', 'Martial arts', 'Sports', 'Driving', 'Instruments', 'Horse riding', 'Swimming', 'Accents']

export default function ActorRegistrationForm() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', stageName: '', email: '', phone: '', password: '', country: '', region: '', city: '',
    ageRange: '', gender: '', languages: '', bio: '', experience: '', level: 'Beginner',
    selectedSkills: [] as string[], showreel: '', training: '', availability: 'Available now',
    auditions: true, filming: true, travel: false, relocation: false, otherSkills: '',
  })

  const update = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    let active = true
    async function loadExistingProfile() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user || !active) return
      const [{ data: profile }, { data: actor }, { data: skillsRows }, { data: languageRows }, { data: experienceRows }, { data: trainingRows }, { data: mediaRows }] = await Promise.all([
        supabase.from('profiles').select('display_name,phone,country,region,city,profile_picture_path').eq('id', auth.user.id).maybeSingle(),
        supabase.from('actor_profiles').select('stage_name,age_range,gender,bio,experience_level,willing_to_travel,willing_to_relocate,availability').eq('user_id', auth.user.id).maybeSingle(),
        supabase.from('actor_skills').select('skill').eq('user_id', auth.user.id),
        supabase.from('actor_languages').select('language').eq('user_id', auth.user.id),
        supabase.from('actor_experience').select('description').eq('user_id', auth.user.id).limit(1),
        supabase.from('actor_training').select('description').eq('user_id', auth.user.id).limit(1),
        supabase.from('actor_media').select('media_type,storage_path').eq('user_id', auth.user.id)
      ])
      if (!active) return
      const showreel = (mediaRows || []).find((m) => m.media_type === 'showreel_url')?.storage_path || ''
      const profilePhoto = (mediaRows || []).find((m) => m.media_type === 'profile_photo')?.storage_path || profile?.profile_picture_path || null
      setForm((current) => ({
        ...current,
        name: profile?.display_name || current.name,
        phone: profile?.phone || auth.user.phone || current.phone,
        country: profile?.country || current.country,
        region: profile?.region || current.region,
        city: profile?.city || current.city,
        stageName: actor?.stage_name || current.stageName,
        ageRange: actor?.age_range || current.ageRange,
        gender: actor?.gender || current.gender,
        bio: actor?.bio || current.bio,
        level: actor?.experience_level || current.level,
        travel: Boolean(actor?.willing_to_travel),
        relocation: Boolean(actor?.willing_to_relocate),
        availability: actor?.availability || current.availability,
        selectedSkills: (skillsRows || []).map((s) => s.skill),
        languages: (languageRows || []).map((l) => l.language).join(', '),
        experience: experienceRows?.[0]?.description || current.experience,
        training: trainingRows?.[0]?.description || current.training,
        showreel,
      }))
      if (profilePhoto) {
        const { data: signed } = await supabase.storage.from('actor-media').createSignedUrl(profilePhoto, 3600)
        if (active && signed?.signedUrl) setPhotoPreview(signed.signedUrl)
      }
    }
    void loadExistingProfile()
    return () => { active = false }
  }, [])
  const toggleSkill = (skill: string) => setForm((current) => ({ ...current, selectedSkills: current.selectedSkills.includes(skill) ? current.selectedSkills.filter((item) => item !== skill) : [...current.selectedSkills, skill] }))

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError('Please choose a JPG, PNG or WebP image.')
    if (file.size > 5 * 1024 * 1024) return setError('Profile pictures must be 5MB or smaller.')
    setError('')
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(String(reader.result))
    reader.readAsDataURL(file)
  }

  const completion = useMemo(() => {
    const fields = [form.name, form.country, form.city, form.ageRange, form.languages, form.bio, form.experience, photoFile]
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  }, [form, photoFile])

  const next = () => {
    setError('')
    if (step === 0) {
      if (!form.name.trim() || !form.phone.trim() || !form.password) return setError('Full name, phone number and password are required.')
      if (form.password.length < 8) return setError('Password must be at least 8 characters.')
      if (!/^\+[1-9]\d{7,14}$/.test(normalizePhone(form.phone))) return setError('Enter your phone number in international format, for example +2348012345678.')
    }
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }
  const back = () => { setError(''); setStep((current) => Math.max(current - 1, 0)) }

  const createProfile = async () => {
    setSaving(true)
    setError('')
    const phone = normalizePhone(form.phone)
    try {
      const { data: authData } = await supabase.auth.getUser()
      let user = authData.user
      if (!user) {
        if (!form.password) throw new Error('Enter your password to create the actor account.')
        const result = await authenticateWithPhone(phone, form.password, 'signup', form.name)
        user = result.user
      }

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id, display_name: form.name.trim(), phone, country: form.country.trim(), region: form.region.trim(), city: form.city.trim(), profile_completed: completion,
      }, { onConflict: 'id' })
      if (profileError) throw profileError

      const { error: actorError } = await supabase.from('actor_profiles').upsert({
        user_id: user.id, stage_name: form.stageName.trim() || null, age_range: form.ageRange || null,
        gender: form.gender || null, bio: form.bio.trim() || null, experience_level: form.level,
        willing_to_travel: form.travel, willing_to_relocate: form.relocation, availability: form.availability,
      }, { onConflict: 'user_id' })
      if (actorError) throw actorError

      // Replace the collections represented by this form before inserting current values.
      // This prevents duplicate skills/languages/experience/training when an actor retries or updates.
      for (const table of ['actor_skills', 'actor_languages', 'actor_experience', 'actor_training'] as const) {
        const { error } = await supabase.from(table).delete().eq('user_id', user.id)
        if (error) throw new Error('Could not update actor ' + table.replace('actor_', '').replaceAll('_', ' ') + ': ' + error.message)
      }

      const allSkills = [...form.selectedSkills, ...form.otherSkills.split(',').map((s) => s.trim()).filter(Boolean)]
      if (allSkills.length) {
        const { error } = await supabase.from('actor_skills').insert(allSkills.map((skill) => ({ user_id: user.id, skill })))
        if (error) throw error
      }

      const languages = form.languages.split(',').map((item) => item.trim()).filter(Boolean)
      if (languages.length) {
        const { error } = await supabase.from('actor_languages').insert(languages.map((language) => ({ user_id: user.id, language, proficiency: 'Professional' })))
        if (error) throw error
      }

      if (form.experience.trim()) {
        const { error } = await supabase.from('actor_experience').insert({ user_id: user.id, title: 'Previous acting / performance experience', experience_type: 'General', description: form.experience.trim() })
        if (error) throw error
      }

      if (form.training.trim()) {
        const { error } = await supabase.from('actor_training').insert({ user_id: user.id, course: 'Acting training and workshops', description: form.training.trim() })
        if (error) throw error
      }

      if (form.showreel.trim()) {
        let showreelUrl: URL
        try { showreelUrl = new URL(form.showreel.trim()) } catch { throw new Error('Enter a valid showreel URL, including https://') }
        if (!['http:', 'https:'].includes(showreelUrl.protocol)) throw new Error('Showreel URL must use http:// or https://')

        const { data: existingShowreel, error: existingShowreelError } = await supabase
          .from('actor_media')
          .select('id')
          .eq('user_id', user.id)
          .eq('media_type', 'showreel_url')
          .maybeSingle()
        if (existingShowreelError) throw existingShowreelError

        const showreelPayload = {
          user_id: user.id,
          media_type: 'showreel_url' as const,
          storage_path: showreelUrl.toString(),
          title: 'Showreel URL',
        }

        if (existingShowreel) {
          const { error } = await supabase.from('actor_media').update(showreelPayload).eq('id', existingShowreel.id).eq('user_id', user.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('actor_media').insert(showreelPayload)
          if (error) throw error
        }
      }

      if (photoFile) {
        const extension = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${user.id}/profile-${Date.now()}.${extension}`
        const { error: uploadError } = await supabase.storage.from('actor-media').upload(path, photoFile, { contentType: photoFile.type, upsert: true })
        if (uploadError) throw uploadError
        const { data: oldPhotos } = await supabase.from('actor_media').select('id,storage_path').eq('user_id', user.id).eq('media_type', 'profile_photo')
        const oldPaths = (oldPhotos || []).map((p) => p.storage_path).filter((p) => p && p !== path && !p.startsWith('http'))
        const { error: mediaDeleteError } = await supabase.from('actor_media').delete().eq('user_id', user.id).eq('media_type', 'profile_photo')
        if (mediaDeleteError) throw mediaDeleteError
        if (oldPaths.length) await supabase.storage.from('actor-media').remove(oldPaths)
        const { error: mediaError } = await supabase.from('actor_media').insert({ user_id: user.id, media_type: 'profile_photo', storage_path: path, title: 'Primary profile picture' })
        if (mediaError) throw mediaError
        const { error: pictureError } = await supabase.from('profiles').update({ profile_picture_path: path }).eq('id', user.id)
        if (pictureError) throw pictureError
      }

      router.push('/account')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not create your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="registration-card">
      <div className="stepper" aria-label="Registration progress">
        {steps.map((label, index) => <div className={`step ${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`} key={label}><span>{index + 1}</span>{label}</div>)}
      </div>
      <div className="completion"><span>Profile readiness</span><strong>{completion}%</strong><div className="progress"><i style={{ width: `${completion}%` }} /></div></div>
      {error && <div className="info-box" role="alert"><strong>Could not continue</strong><p>{error}</p></div>}
      {step === 0 && <section className="form-section"><h2>Let&apos;s create your account.</h2><p className="muted">Your account uses your phone number and password. No email or OTP is required for normal platform users.</p><div className="form-grid"><label>Full name<input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your legal or professional name" /></label><label>Stage name <small>Optional</small><input value={form.stageName} onChange={(e) => update('stageName', e.target.value)} placeholder="Name you perform under" /></label><label>Email address <small>Optional contact only</small><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" /></label><label>Phone number<input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+2348012345678" /></label><label>Password<input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 8 characters" /></label><label>Country<input value={form.country} onChange={(e) => update('country', e.target.value)} placeholder="Country" /></label></div></section>}
      {step === 1 && <section className="form-section"><h2>Tell us about the actor.</h2><p className="muted">Location is structured globally so casting teams can search by country, region and city.</p><div className="photo-row"><div className="photo-preview">{photoPreview ? <img src={photoPreview} alt="Profile preview" /> : <span>PHOTO</span>}</div><div><h3>Primary profile picture</h3><p className="muted">Use a clear photo of yourself. JPG, PNG or WebP, up to 5MB.</p><label className="btn secondary upload">{photoPreview ? 'Replace picture' : 'Upload picture'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} hidden /></label><small className="hint">Your photo will be securely stored with your profile.</small></div></div><div className="form-grid"><label>Age range<select value={form.ageRange} onChange={(e) => update('ageRange', e.target.value)}><option value="">Select</option><option>Under 18</option><option>18–24</option><option>25–34</option><option>35–44</option><option>45–54</option><option>55+</option></select></label><label>Gender <small>Optional</small><select value={form.gender} onChange={(e) => update('gender', e.target.value)}><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Other</option></select></label><label>Region / state / province<input value={form.region} onChange={(e) => update('region', e.target.value)} placeholder="Region, state or province" /></label><label>City<input value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="City" /></label><label>Languages<input value={form.languages} onChange={(e) => update('languages', e.target.value)} placeholder="English, French, Yoruba..." /></label><label>Experience level<select value={form.level} onChange={(e) => update('level', e.target.value)}><option>Beginner</option><option>Developing</option><option>Experienced</option></select></label><label className="full">Professional bio<textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} placeholder="Introduce yourself, your acting interests and the kinds of stories you want to work on." rows={5} /></label><label className="full">Previous acting / theatre / school / performance experience<textarea value={form.experience} onChange={(e) => update('experience', e.target.value)} placeholder="Include productions, school performances, theatre, short films or other relevant experience. Beginners can describe practice and training." rows={5} /></label></div></section>}
      {step === 2 && <section className="form-section"><h2>Show what you can do.</h2><p className="muted">Special skills help production teams understand your range. Select everything that genuinely applies.</p><div className="skill-grid">{skills.map((skill) => <button type="button" className={`skill ${form.selectedSkills.includes(skill) ? 'selected' : ''}`} onClick={() => toggleSkill(skill)} key={skill}>{form.selectedSkills.includes(skill) ? '✓ ' : ''}{skill}</button>)}</div><label>Other special skills <small>Optional</small><input value={form.otherSkills} onChange={(e) => update('otherSkills', e.target.value)} placeholder="Accents, dialects, creative skills, etc." /></label><div className="info-box"><strong>Audition readiness</strong><p>Be ready to learn scripts, perform scenes, take direction and record a simple self-tape when requested.</p></div></section>}
      {step === 3 && <section className="form-section"><h2>Add media and training.</h2><p className="muted">A showreel is useful but not required. Beginners can start with a simple, professionally recorded scene.</p><div className="form-grid"><label className="full">Showreel URL <small>Optional</small><input value={form.showreel} onChange={(e) => update('showreel', e.target.value)} placeholder="https://..." /></label><label className="full">Training, classes & workshops <small>Optional</small><textarea value={form.training} onChange={(e) => update('training', e.target.value)} placeholder="Acting schools, workshops, coaches, theatre training or certifications." rows={5} /></label></div><div className="media-note"><strong>Your profile picture is stored when you create the profile.</strong><p>Professional headshots, audition videos, scenes and voice samples can be added to the same secure media system later.</p></div></section>}
      {step === 4 && <section className="form-section"><h2>Set your availability.</h2><p className="muted">Production teams need to know when and where you can work.</p><div className="form-grid"><label>General availability<select value={form.availability} onChange={(e) => update('availability', e.target.value)}><option>Available now</option><option>Available from a future date</option><option>Limited availability</option></select></label><div className="check-list"><label><input type="checkbox" checked={form.auditions} onChange={(e) => update('auditions', e.target.checked)} /> Auditions</label><label><input type="checkbox" checked={form.filming} onChange={(e) => update('filming', e.target.checked)} /> Filming</label><label><input type="checkbox" checked={form.travel} onChange={(e) => update('travel', e.target.checked)} /> Willing to travel</label><label><input type="checkbox" checked={form.relocation} onChange={(e) => update('relocation', e.target.checked)} /> Open to relocation</label></div></div><div className="info-box"><strong>Professionalism matters.</strong><p>By publishing your profile, you acknowledge the importance of punctuality, respect, clear communication, taking direction, professional conduct and willingness to learn.</p></div><div className="publish-preview"><div className="mini-avatar">{photoPreview ? <img src={photoPreview} alt="" /> : '★'}</div><div><strong>{form.stageName || form.name || 'Your name'}</strong><p>{form.city || 'City'}{form.country ? `, ${form.country}` : ''} · {form.level}</p></div></div></section>}
      <div className="form-actions"><button className="btn secondary" type="button" onClick={back} disabled={step === 0 || saving}>← Back</button>{step < steps.length - 1 ? <button className="btn primary" type="button" onClick={next}>Continue →</button> : <button className="btn primary" type="button" onClick={createProfile} disabled={saving}>{saving ? 'Creating profile…' : 'Create Actor Profile →'}</button>}</div>
      <p className="form-footnote">Your account, profile data and uploaded profile picture are saved to the platform when you create your profile.</p>
    </div>
  )
}
