import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 })

  const body = await request.json() as { new_password?: string; confirm_password?: string }

  if (!body.new_password || body.new_password.length < 8) {
    return NextResponse.json({ error: 'Şifre en az 8 karakter olmalı.' }, { status: 400 })
  }
  if (body.new_password !== body.confirm_password) {
    return NextResponse.json({ error: 'Şifreler eşleşmiyor.' }, { status: 400 })
  }

  const { error } = await supabase.auth.updateUser({ password: body.new_password })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
