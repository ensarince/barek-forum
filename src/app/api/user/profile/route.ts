import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isOurCloudinaryUrl } from '@/lib/images'

// Real https URL, nothing else (no javascript:, data:, http:, credentials in the URL)
function isValidHttpsUrl(val: string): boolean {
  try {
    const u = new URL(val)
    return u.protocol === 'https:' && !u.username && !u.password
  } catch {
    return false
  }
}

const LINK_FIELDS = ['eight_a_url', 'topo_url', 'instagram_url', 'youtube_url'] as const

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })

  const update: Record<string, string | null> = {}

  if (typeof body.full_name === 'string') {
    if (body.full_name.trim().length > 100) return NextResponse.json({ error: 'İsim çok uzun.' }, { status: 400 })
    update.full_name = body.full_name.trim() || null
  }

  // Avatar must be our own Cloudinary upload — any other host would be a tracking pixel for every viewer
  if (typeof body.avatar_url === 'string') {
    const val = body.avatar_url.trim()
    if (val && !isOurCloudinaryUrl(val)) return NextResponse.json({ error: 'Geçersiz profil fotoğrafı.' }, { status: 400 })
    update.avatar_url = val || null
  }

  for (const field of LINK_FIELDS) {
    const raw = body[field]
    if (typeof raw !== 'string') continue
    const val = raw.trim()
    if (val && (val.length > 500 || !isValidHttpsUrl(val))) {
      return NextResponse.json({ error: `${field}: geçerli bir https:// bağlantısı olmalı` }, { status: 400 })
    }
    update[field] = val || null
  }

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)

  if (error) {
    console.error('[profile] update failed:', error)
    return NextResponse.json({ error: 'Profil güncellenemedi.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
