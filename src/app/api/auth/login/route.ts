import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json() as { email: string; password: string }
    if (!email || !password) {
      return NextResponse.json({ error: 'Email ve şifre gerekli.' }, { status: 400 })
    }

    // Rate limit: 10 attempts per email per 15 minutes
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!rateLimit(`login:${email}:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Çok fazla deneme. 15 dakika sonra tekrar dene.' }, { status: 429 })
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json({ error: 'Email veya şifre hatalı.' }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Bir hata oluştu.' }, { status: 500 })
  }
}
