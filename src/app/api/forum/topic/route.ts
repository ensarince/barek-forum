import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Profile, Sector, Image as ImageRow } from '@/types/database'

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

  const body = await request.json() as { title?: string; content?: string; sector_id?: string; tag?: string; type?: string; with_poll?: boolean; images?: { url: string; publicId: string }[] }
  const { title, content, sector_id, tag, type, with_poll, images } = body

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

  // Validate sector if provided
  if (sector_id) {
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
      tag: isAnnouncement ? null : (tag?.trim() || null),
      type: isAnnouncement ? 'announcement' : 'discussion',
      status: (isAnnouncement || profile.role === 'admin') ? 'approved' : 'pending',
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

  // Notify all admins of the pending topic (skip if the poster is already an admin)
  if (!isAnnouncement && profile.role !== 'admin') {
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
    const adminIds = ((adminProfiles ?? []) as { id: string }[]).filter((a) => a.id !== user.id)
    if (adminIds.length > 0) {
      await supabase.from('notifications').insert(
        adminIds.map((a) => ({
          user_id: a.id,
          type: 'topic_pending',
          reference_id: topic.id,
          is_read: false,
        }))
      )
    }
  }

  // Save images attached to the opening post
  let savedImages: ImageRow[] = []
  if (images && images.length > 0) {
    const imageInserts = images.map((img) => ({
      uploader_id: user.id,
      cloudinary_url: img.url,
      cloudinary_id: img.publicId,
      topic_id: topic.id,
      post_id: null,
    }))
    const { data: imgData } = await supabase.from('images').insert(imageInserts).select()
    savedImages = (imgData ?? []) as ImageRow[]
  }

  return NextResponse.json({ success: true, topicId: topic.id, images: savedImages })
}
