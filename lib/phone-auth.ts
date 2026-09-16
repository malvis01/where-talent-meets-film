import { supabase } from '@/lib/supabase'

type PhoneAuthMode = 'login' | 'signup'

type PhoneAuthResponse = {
  user: import('@supabase/supabase-js').User
  session: import('@supabase/supabase-js').Session
}

export function normalizePhone(value: string) {
  return value.trim().replace(/[\s()-]/g, '')
}

export async function authenticateWithPhone(phoneValue: string, password: string, mode: PhoneAuthMode, name?: string) {
  const phone = normalizePhone(phoneValue)
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error('Enter a valid international phone number, including the country code (for example, +2348012345678).')
  }
  if (password.length < 8) throw new Error('Password must be at least 8 characters.')

  const { data, error } = await supabase.functions.invoke('phone-password-auth', {
    body: { phone, password, mode, name: name?.trim() || undefined },
  })
  if (error) throw error
  if (!data?.user || !data?.session) throw new Error('Authentication did not return a valid session. Please try again.')

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
  if (sessionError) throw sessionError

  return data as PhoneAuthResponse
}
