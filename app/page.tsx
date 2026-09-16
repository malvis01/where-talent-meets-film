const features = [
  ['◉','Build your talent profile','Create a professional actor profile with a required profile picture, headshots, experience, skills, languages and availability.'],
  ['◇','Discover opportunities','Explore casting calls and roles from production teams, with location and travel preferences built for a global audience.'],
  ['✦','Show what you can do','Add showreels, self-tapes, voice samples and special skills so casting teams can understand your range.'],
]

export default function Home() {
  return (
    <main>
      <nav className="nav container">
        <a className="brand" href="#top">Where Talent <span>Meets Film</span></a>
        <div className="links"><a href="#talent">For Actors</a><a href="#production">For Production</a><a href="#how">How It Works</a></div>
        <a className="btn secondary" href="/actors/register">Join Platform</a>
      </nav>

      <section className="hero container" id="top">
        <div>
          <div className="eyebrow">Golding&apos;s Production Company</div>
          <h1>Talent has no <em>borders.</em></h1>
          <p>Where Talent Meets Film is a global platform built to help actors present their talent professionally and help production teams discover people for stories worth telling.</p>
          <div className="actions"><a className="btn primary" href="/actors/register">Create Actor Profile →</a><a className="btn secondary" href="#production">Find Talent</a></div>
        </div>
        <div className="showcase" aria-label="Actor profile preview">
          <div className="profile-card"><div className="avatar">★</div><h3>Your talent. Your story.</h3><div className="muted">Professional actor profile</div><div className="tags"><span className="tag">Acting</span><span className="tag">Film</span><span className="tag">Self-tape</span><span className="tag">Available</span></div></div>
        </div>
      </section>

      <section className="section container" id="talent"><div className="eyebrow">Built for talent</div><h2>Put your work in front of the right people.</h2><p className="section-intro">From beginners recording their first scene to experienced performers with showreels, the platform is designed around a complete, useful talent profile.</p><div className="grid">{features.map(([icon,title,text])=><article className="card" key={title}><div className="icon">{icon}</div><h3>{title}</h3><p>{text}</p></article>)}</div></section>

      <section className="section container" id="production"><div className="eyebrow">For production teams</div><h2>Find talent with context.</h2><p className="section-intro">Search by location, age range, experience, languages, special skills, availability and media. Create casting opportunities and move applicants through review, audition and shortlist stages.</p><div className="grid"><article className="card"><h3>Talent discovery</h3><p>Explore actor profiles with the information needed for practical casting decisions.</p></article><article className="card"><h3>Casting calls</h3><p>Create roles with requirements, location, languages, skills and audition instructions.</p></article><article className="card"><h3>Review & shortlist</h3><p>Manage applications, request auditions and keep promising talent organized.</p></article></div></section>

      <section className="container" id="join"><div className="cta"><div><div className="eyebrow">Start your journey</div><h2>Where talent meets opportunity.</h2></div><div className="actions"><a className="btn primary" href="/actors/register">I&apos;m an Actor</a><a className="btn secondary" href="#production">I&apos;m Production</a></div></div></section>

      <footer className="footer container"><div>© {new Date().getFullYear()} Golding&apos;s Production Company</div><div>Where Talent Meets Film · Talent Without Borders</div></footer>
    </main>
  )
}
