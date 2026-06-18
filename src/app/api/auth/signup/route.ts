import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json()

    if (!email || !password || !username) {
      return NextResponse.json({ error: 'Eksik bilgi.' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Use admin client (service role) — bypasses all RLS and trigger issues
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
      email_confirm: true, // skip email confirmation
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Kullanıcı oluşturulamadı.' },
        { status: 500 }
      )
    }

    // Create profile row directly — no trigger needed
    const { error: profileError } = await admin.from('profiles').insert({
      id: authData.user.id,
      username,
      status: 'pending',
      role: 'user',
    })

    if (profileError) {
      // Rollback: delete the auth user if profile creation failed
      await admin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Profil oluşturulamadı: ' + profileError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Signup route error:', e)
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}
