import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Where Talent Meets Film | Golding\'s Production Company',
  description: 'A global platform connecting acting talent with film and production opportunities.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
