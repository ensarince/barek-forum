import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Profile, Sector } from '@/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('status, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as Pick<Profile, 'status' | 'role'> | null
  if (!profile || profile.status !== 'approved') {
    return NextResponse.json({ error: 'Hesabın onaylı değil.' }, { status: 403 })
  }

  const body = await request.json() as { title?: string; content?: string; sector_id?: string; type?: string; with_poll?: boolean }
  const { title, content, sector_id, type, with_poll } = body

  const isAnnouncement = type === 'announcement'

  // Announcements are admin-only
  if (isAnnouncement && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Sadece adminler duyuru paylaşabilir.' }, { status: 403 })
  }

  if (!title || title.trim().length < 3) {
    return NextResponse.json({ error: 'Başlık en az 3 karakter olmalı.' }, { status: 400 })
  }
  if (!content || !content.trim()) {
    return NextResponse.json({ error: 'İçerik boş olamaz.' }, { status: 400 })
  }
  if (!isAnnouncement) {
    if (!sector_id) {
      return NextResponse.json({ error: 'Sektör seçmelisin.' }, { status: 400 })
    }
    const { data: sectorData } = await supabase.from('sectors').select('id').eq('id', sector_id).single()
    const sector = sectorData as Pick<Sector, 'id'> | null
    if (!sector) {
      return NextResponse.json({ error: 'Geçersiz sektör.' }, { status: 400 })
    }
  }

  const { data: topicData, error: topicError } = await supabase
    .from('topics')
    .insert({
      title: title.trim(),
      content: content.trim(),
      author_id: user.id,
      sector_id: isAnnouncement ? null : (sector_id ?? null),
      type: isAnnouncement ? 'announcement' : 'discussion',
      status: isAnnouncement ? 'approved' : 'pending',
      is_pinned: isAnnouncement,
    })
    .select('id')
    .single()

  if (topicError || !topicData) {
    return NextResponse.json({ error: 'Konu oluşturulamadı.' }, { status: 500 })
  }

  const topic = topicData as { id: string }

  if (with_poll && !isAnnouncement) {
    await supabase.from('polls').insert({
      topic_id: topic.id,
      question: 'Bu rotanın derecesi nedir?',
    })
  }

  return NextResponse.json({ success: true, topicId: topic.id })
}
