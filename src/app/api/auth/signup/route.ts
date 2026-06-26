import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { emailAdminsNewUser } from '@/lib/email'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

    // Rate limit: 3 signups per IP per hour
    if (!rateLimit(`signup:${ip}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Çok fazla kayıt denemesi. Lütfen daha sonra tekrar dene.' }, { status: 429 })
    }

    const { email, password, username } = await request.json()

    if (!email || !password || !username) {
      return NextResponse.json({ error: 'Eksik bilgi.' }, { status: 400 })
    }

    // Server-side username validation — mirrors the client-side Zod schema
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json({ error: 'Kullanıcı adı 3-30 karakter olmalı ve sadece harf, rakam, alt çizgi içerebilir.' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Check username not already taken
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Bu kullanıcı adı zaten alınmış.' }, { status: 409 })
    }

    // Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      // Never expose the raw provider error — it leaks whether the email is registered
      console.error('[signup] createUser failed:', authError?.message)
      return NextResponse.json({ error: 'Kullanıcı oluşturulamadı.' }, { status: 500 })
    }

    // Create profile row directly
    const { error: profileError } = await admin.from('profiles').insert({
      id: authData.user.id,
      username,
      status: 'pending',
      role: 'user',
    })

    if (profileError) {
      await admin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Profil oluşturulamadı.' }, { status: 500 })
    }

    // Notify admins of the pending user registration
    const { data: adminProfiles } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
    const adminIds = (adminProfiles ?? []) as { id: string }[]
    if (adminIds.length > 0) {
      await admin.from('notifications').insert(
        adminIds.map((a) => ({
          user_id: a.id,
          type: 'user_pending',
          reference_id: authData.user.id,
          is_read: false,
        }))
      )
      await emailAdminsNewUser(adminIds.map((a) => a.id), username, email)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Signup route error:', e)
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}
