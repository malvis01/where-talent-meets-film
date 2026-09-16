import ActorRegistrationForm from './ActorRegistrationForm'

export const metadata = {
  title: 'Create Actor Profile | Where Talent Meets Film',
  description: 'Create a professional global actor profile for casting opportunities.',
}

export default function ActorRegistrationPage() {
  return (
    <main className="registration-page">
      <div className="container registration-shell">
        <a className="back-link" href="/">← Where Talent Meets Film</a>
        <div className="registration-heading">
          <div className="eyebrow">Actor registration</div>
          <h1>Build your professional actor profile.</h1>
          <p>Whether you are just starting out or already experienced, tell production teams what you can bring to a story.</p>
        </div>
        <ActorRegistrationForm />
      </div>
    </main>
  )
}
