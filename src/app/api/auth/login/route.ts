import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'
import { clientIp, isSameOriginJson } from '@/lib/requestGuards'

export async function POST(request: Request) {
  try {
    // Block cross-site posts that would log a visitor into someone else's account
    if (!isSameOriginJson(request)) {
      return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
    }

    const { email, password } = await request.json() as { email?: unknown; password?: unknown }
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return NextResponse.json({ error: 'Email ve şifre gerekli.' }, { status: 400 })
    }
    const normalizedEmail = email.trim().toLowerCase()

    // Two limits: per account (any IP, any capitalisation of the email) and per IP (any account)
    const ip = clientIp(request)
    const tooMany = !await rateLimit(`login:acct:${normalizedEmail}`, 20, 60 * 60 * 1000)
      || !await rateLimit(`login:ip:${ip}`, 30, 15 * 60 * 1000)
    if (tooMany) {
      return NextResponse.json({ error: 'Çok fazla deneme. Biraz sonra tekrar dene.' }, { status: 429 })
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })

    if (error) {
      return NextResponse.json({ error: 'Email veya şifre hatalı.' }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Bir hata oluştu.' }, { status: 500 })
  }
}
