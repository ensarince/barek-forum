import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { emailAdminBugReport } from '@/lib/email'
import type { Profile } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

    const { data: profileData } = await supabase.from('profiles').select('username, status').eq('id', user.id).single()
    const profile = profileData as Pick<Profile, 'username' | 'status'> | null
    if (!profile || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Hesabın onaylı değil.' }, { status: 403 })
    }

    const body = await request.json() as { description?: string; pageUrl?: string }
    const { description, pageUrl } = body
    if (!description || description.trim().length < 10) {
      return NextResponse.json({ error: 'Açıklama çok kısa (en az 10 karakter).' }, { status: 400 })
    }

    const service = createServiceClient()
    await service.from('bug_reports').insert({
      reporter_id: user.id,
      description: description.trim(),
      page_url: pageUrl ?? null,
      status: 'open',
    })

    const { data: adminProfiles } = await service.from('profiles').select('id').eq('role', 'admin')
    const adminIds = ((adminProfiles ?? []) as { id: string }[]).map((a) => a.id)
    if (adminIds.length > 0) {
      await emailAdminBugReport(adminIds, profile.username, description.trim(), pageUrl ?? '')
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const profile = profileData as Pick<Profile, 'role'> | null
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, status } = await request.json() as { id: string; status: string }
    if (!id || !['open', 'resolved'].includes(status)) {
      return NextResponse.json({ error: 'Geçersiz alan.' }, { status: 400 })
    }

    const service = createServiceClient()
    await service.from('bug_reports').update({ status }).eq('id', id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}
