'use client'

import { ChangeEvent, useMemo, useState } from 'react'

const steps = ['Account', 'Profile', 'Skills', 'Media & training', 'Availability']
const skills = ['Dancing', 'Singing', 'Martial arts', 'Sports', 'Driving', 'Instruments', 'Horse riding', 'Swimming', 'Accents']

export default function ActorRegistrationForm() {
  const [step, setStep] = useState(0)
  const [photo, setPhoto] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', stageName: '', email: '', phone: '', password: '', country: '', region: '', city: '',
    ageRange: '', gender: '', languages: '', bio: '', experience: '', level: 'Beginner',
    selectedSkills: [] as string[], showreel: '', training: '', availability: 'Available now',
    auditions: true, filming: true, travel: false, relocation: false,
  })

  const update = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))
  const toggleSkill = (skill: string) => setForm((current) => ({ ...current, selectedSkills: current.selectedSkills.includes(skill) ? current.selectedSkills.filter((item) => item !== skill) : [...current.selectedSkills, skill] }))

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(String(reader.result))
    reader.readAsDataURL(file)
  }

  const completion = useMemo(() => {
    const fields = [form.name, form.email, form.country, form.city, form.ageRange, form.languages, form.bio, form.experience, photo]
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  }, [form, photo])

  const next = () => setStep((current) => Math.min(current + 1, steps.length - 1))
  const back = () => setStep((current) => Math.max(current - 1, 0))

  return (
    <div className="registration-card">
      <div className="stepper" aria-label="Registration progress">
        {steps.map((label, index) => <div className={`step ${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`} key={label}><span>{index + 1}</span>{label}</div>)}
      </div>

      <div className="completion"><span>Profile readiness</span><strong>{completion}%</strong><div className="progress"><i style={{ width: `${completion}%` }} /></div></div>

      {step === 0 && <section className="form-section">
        <h2>Let&apos;s create your account.</h2><p className="muted">Your contact details stay private unless you choose to share them with production teams.</p>
        <div className="form-grid">
          <label>Full name<input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your legal or professional name" /></label>
          <label>Stage name <small>Optional</small><input value={form.stageName} onChange={(e) => update('stageName', e.target.value)} placeholder="Name you perform under" /></label>
          <label>Email address<input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" /></label>
          <label>Phone number<input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="International format" /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Create a secure password" /></label>
          <label>Country<input value={form.country} onChange={(e) => update('country', e.target.value)} placeholder="Country" /></label>
        </div>
      </section>}

      {step === 1 && <section className="form-section">
        <h2>Tell us about the actor.</h2><p className="muted">Location is structured globally so casting teams can search by country, region and city.</p>
        <div className="photo-row"><div className="photo-preview">{photo ? <img src={photo} alt="Profile preview" /> : <span>PHOTO</span>}</div><div><h3>Primary profile picture</h3><p className="muted">Use a clear photo of yourself. JPG, PNG or WebP.</p><label className="btn secondary upload">{photo ? 'Replace picture' : 'Upload picture'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} hidden /></label><small className="hint">Profile picture is separate from professional headshots.</small></div></div>
        <div className="form-grid">
          <label>Age range<select value={form.ageRange} onChange={(e) => update('ageRange', e.target.value)}><option value="">Select</option><option>Under 18</option><option>18–24</option><option>25–34</option><option>35–44</option><option>45–54</option><option>55+</option></select></label>
          <label>Gender <small>Optional</small><select value={form.gender} onChange={(e) => update('gender', e.target.value)}><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Other</option></select></label>
          <label>Region / state / province<input value={form.region} onChange={(e) => update('region', e.target.value)} placeholder="Region, state or province" /></label>
          <label>City<input value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="City" /></label>
          <label>Languages<input value={form.languages} onChange={(e) => update('languages', e.target.value)} placeholder="English, French, Yoruba..." /></label>
          <label>Experience level<select value={form.level} onChange={(e) => update('level', e.target.value)}><option>Beginner</option><option>Developing</option><option>Experienced</option></select></label>
          <label className="full">Professional bio<textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} placeholder="Introduce yourself, your acting interests and the kinds of stories you want to work on." rows={5} /></label>
          <label className="full">Previous acting / theatre / school / performance experience<textarea value={form.experience} onChange={(e) => update('experience', e.target.value)} placeholder="Include productions, school performances, theatre, short films or other relevant experience. Beginners can describe practice and training." rows={5} /></label>
        </div>
      </section>}

      {step === 2 && <section className="form-section">
        <h2>Show what you can do.</h2><p className="muted">Special skills help production teams understand your range. Select everything that genuinely applies.</p>
        <div className="skill-grid">{skills.map((skill) => <button type="button" className={`skill ${form.selectedSkills.includes(skill) ? 'selected' : ''}`} onClick={() => toggleSkill(skill)} key={skill}>{form.selectedSkills.includes(skill) ? '✓ ' : ''}{skill}</button>)}</div>
        <label>Other special skills <small>Optional</small><input placeholder="Accents, dialects, creative skills, etc." /></label>
        <div className="info-box"><strong>Audition readiness</strong><p>Be ready to learn scripts, perform scenes, take direction and record a simple self-tape when requested.</p></div>
      </section>}

      {step === 3 && <section className="form-section">
        <h2>Add media and training.</h2><p className="muted">A showreel is useful but not required. Beginners can start with a simple, professionally recorded scene.</p>
        <div className="form-grid">
          <label className="full">Showreel URL <small>Optional for now</small><input value={form.showreel} onChange={(e) => update('showreel', e.target.value)} placeholder="https://..." /></label>
          <label className="full">Training, classes & workshops <small>Optional</small><textarea value={form.training} onChange={(e) => update('training', e.target.value)} placeholder="Acting schools, workshops, coaches, theatre training or certifications." rows={5} /></label>
        </div>
        <div className="media-note"><strong>More media can be added later.</strong><p>The full platform will support professional headshots, audition videos, scenes and voice samples without making a beginner wait for a showreel.</p></div>
      </section>}

      {step === 4 && <section className="form-section">
        <h2>Set your availability.</h2><p className="muted">Production teams need to know when and where you can work.</p>
        <div className="form-grid">
          <label>General availability<select value={form.availability} onChange={(e) => update('availability', e.target.value)}><option>Available now</option><option>Available from a future date</option><option>Limited availability</option></select></label>
          <div className="check-list"><label><input type="checkbox" checked={form.auditions} onChange={(e) => update('auditions', e.target.checked)} /> Auditions</label><label><input type="checkbox" checked={form.filming} onChange={(e) => update('filming', e.target.checked)} /> Filming</label><label><input type="checkbox" checked={form.travel} onChange={(e) => update('travel', e.target.checked)} /> Willing to travel</label><label><input type="checkbox" checked={form.relocation} onChange={(e) => update('relocation', e.target.checked)} /> Open to relocation</label></div>
        </div>
        <div className="info-box"><strong>Professionalism matters.</strong><p>By publishing your profile, you acknowledge the importance of punctuality, respect, clear communication, taking direction, professional conduct and willingness to learn.</p></div>
        <div className="publish-preview"><div className="mini-avatar">{photo ? <img src={photo} alt="" /> : '★'}</div><div><strong>{form.stageName || form.name || 'Your name'}</strong><p>{form.city || 'City'}{form.country ? `, ${form.country}` : ''} · {form.level}</p></div></div>
      </section>}

      <div className="form-actions"><button className="btn secondary" type="button" onClick={back} disabled={step === 0}>← Back</button>{step < steps.length - 1 ? <button className="btn primary" type="button" onClick={next}>Continue →</button> : <button className="btn primary" type="button" onClick={() => alert('Profile foundation complete. Account and media storage will be connected next.')}>Create Actor Profile →</button>}</div>
      <p className="form-footnote">This is the first profile-building foundation. Secure account authentication and permanent photo/media storage will be connected to the database and storage layer before production launch.</p>
    </div>
  )
}
