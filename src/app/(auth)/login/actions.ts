'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'

export type LoginState = { error: string } | null

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = ((formData.get('email') as string) ?? '').trim()
  const password = (formData.get('password') as string) ?? ''

  if (!email || !password) {
    return { error: 'Email ve şifre gerekli.' }
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(`login:${email}:${ip}`, 10, 15 * 60 * 1000)) {
    return { error: 'Çok fazla deneme. 15 dakika sonra tekrar dene.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email veya şifre hatalı.' }
  }

  redirect('/')
}
