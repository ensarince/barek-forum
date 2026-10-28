import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Profile, Sector, Image as ImageRow } from '@/types/database'
import { emailAdminsNewTopic, emailAllUsersAnnouncement } from '@/lib/email'
import { notifyTopicMentions } from '@/lib/mentions'
import { isAllowedImage } from '@/lib/images'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('status, role, username')
    .eq('id', user.id)
    .single()

  const profile = profileData as Pick<Profile, 'status' | 'role' | 'username'> | null
  if (!profile || profile.status !== 'approved') {
    return NextResponse.json({ error: 'Hesabın onaylı değil.' }, { status: 403 })
  }

  if (!await rateLimit(`topic:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Çok fazla konu açtın, biraz bekle.' }, { status: 429 })
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
  if (title.trim().length > 200) {
    return NextResponse.json({ error: 'Başlık çok uzun (max 200 karakter).' }, { status: 400 })
  }
  if (!content || !content.trim()) {
    return NextResponse.json({ error: 'İçerik boş olamaz.' }, { status: 400 })
  }
  if (content.trim().length > 50000) {
    return NextResponse.json({ error: 'İçerik çok uzun (max 50.000 karakter).' }, { status: 400 })
  }
  if (tag && tag.trim().length > 50) {
    return NextResponse.json({ error: 'Etiket çok uzun (max 50 karakter).' }, { status: 400 })
  }
  if ((images ?? []).length > 5) {
    return NextResponse.json({ error: 'En fazla 5 fotoğraf eklenebilir.' }, { status: 400 })
  }
  // Only our Cloudinary uploads and Giphy GIFs
  if (!Array.isArray(images ?? []) || !(images ?? []).every(isAllowedImage)) {
    return NextResponse.json({ error: 'Geçersiz fotoğraf.' }, { status: 400 })
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
  const service = createServiceClient()

  // Save images + poll right away, and undo the topic if either fails —
  // before any notification or email goes out
  let savedImages: ImageRow[] = []
  const validatedImages = images ?? [] // validated above
  if (validatedImages.length > 0) {
    const imageInserts = validatedImages.map((img) => ({
      uploader_id: user.id,
      cloudinary_url: img.url,
      cloudinary_id: img.publicId,
      topic_id: topic.id,
      post_id: null,
    }))
    const { data: imgData, error: imgError } = await supabase.from('images').insert(imageInserts).select()
    if (imgError) {
      await service.from('topics').delete().eq('id', topic.id)
      return NextResponse.json({ error: 'Fotoğraflar kaydedilemedi, tekrar dene.' }, { status: 500 })
    }
    savedImages = (imgData ?? []) as ImageRow[]
  }

  if (with_poll && !isAnnouncement) {
    const { error: pollError } = await supabase.from('polls').insert({
      topic_id: topic.id,
      question: 'Bu rotanın derecesi nedir?',
    })
    if (pollError) {
      await service.from('images').delete().eq('topic_id', topic.id)
      await service.from('topics').delete().eq('id', topic.id)
      return NextResponse.json({ error: 'Anket oluşturulamadı, tekrar dene.' }, { status: 500 })
    }
  }

  // Notify all approved users when an announcement is posted
  if (isAnnouncement) {
    const { data: allUsers } = await service
      .from('profiles')
      .select('id')
      .eq('status', 'approved')
      .neq('id', user.id)
    const userIds = ((allUsers ?? []) as { id: string }[]).map((u) => u.id)
    if (userIds.length > 0) {
      await service.from('notifications').insert(
        userIds.map((id) => ({
          user_id: id,
          type: 'announcement_posted',
          reference_id: topic.id,
          is_read: false,
        }))
      )
      await emailAllUsersAnnouncement(userIds, title.trim(), topic.id)
    }
  }

  // Notify all admins of the pending topic (skip if the poster is already an admin)
  if (!isAnnouncement && profile.role !== 'admin') {
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
    const adminIds = ((adminProfiles ?? []) as { id: string }[]).filter((a) => a.id !== user.id)
    if (adminIds.length > 0) {
      await service.from('notifications').insert(
        adminIds.map((a) => ({
          user_id: a.id,
          type: 'topic_pending',
          reference_id: topic.id,
          is_read: false,
        }))
      )
      // BUG 7 FIX: guard against empty username
      await emailAdminsNewTopic(adminIds.map((a) => a.id), profile.username || 'kullanıcı', title.trim())
    }
  }

  // @mentions notify only once the topic is live — pending topics get theirs on admin approval
  const isImmediatelyApproved = isAnnouncement || profile.role === 'admin'
  if (isImmediatelyApproved) {
    await notifyTopicMentions({
      topicId: topic.id,
      title: title.trim(),
      content: content.trim(),
      authorId: user.id,
      authorUsername: profile.username,
    })
  }

  return NextResponse.json({ success: true, topicId: topic.id, images: savedImages })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topic_id, content } = await request.json() as { topic_id: string; content: string }
  if (!topic_id || !content?.trim()) return NextResponse.json({ error: 'Eksik alan.' }, { status: 400 })
  if (content.trim().length > 50000) {
    return NextResponse.json({ error: 'İçerik çok uzun (max 50.000 karakter).' }, { status: 400 })
  }

  const { data: topicData } = await supabase.from('topics').select('author_id').eq('id', topic_id).single()
  const topic = topicData as { author_id: string } | null
  if (!topic) return NextResponse.json({ error: 'Konu bulunamadı.' }, { status: 404 })

  const { data: profileData } = await supabase.from('profiles').select('role, status').eq('id', user.id).single()
  const profile = profileData as Pick<Profile, 'role' | 'status'> | null
  if (profile?.status !== 'approved') return NextResponse.json({ error: 'Hesabın onaylı değil.' }, { status: 403 })
  if (topic.author_id !== user.id && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 403 })
  }

  const service = createServiceClient()
  const { error } = await service.from('topics').update({ content: content.trim(), updated_at: new Date().toISOString() }).eq('id', topic_id)
  if (error) return NextResponse.json({ error: 'Güncelleme başarısız.' }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topic_id } = await request.json() as { topic_id: string }
  if (!topic_id) return NextResponse.json({ error: 'Eksik alan.' }, { status: 400 })

  const { data: topicData } = await supabase.from('topics').select('author_id').eq('id', topic_id).single()
  const topic = topicData as { author_id: string } | null
  if (!topic) return NextResponse.json({ error: 'Konu bulunamadı.' }, { status: 404 })

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileData as Pick<Profile, 'role'> | null
  const isAdmin = profile?.role === 'admin'
  if (topic.author_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 403 })
  }

  const service = createServiceClient()

  // Authors can't delete a topic once others have replied — that would hide their replies too
  if (!isAdmin) {
    const { count } = await service
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('topic_id', topic_id)
      .eq('is_deleted', false)
      .neq('author_id', user.id)
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'Başkaları yanıt verdiği için bu konuyu silemezsin. Bir admin ile iletişime geç.' }, { status: 403 })
    }
  }

  // Soft delete — the topic and its replies stay in the database and can be restored
  const { error } = await service
    .from('topics')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', topic_id)
  if (error) return NextResponse.json({ error: 'Silme başarısız.' }, { status: 500 })
  await service.from('notifications').delete().eq('reference_id', topic_id)
  return NextResponse.json({ success: true })
}
