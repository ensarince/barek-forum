import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Topic, Post, Image as ImageRow, Poll, Profile } from '@/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    topic_id?: string
    content?: string
    parent_post_id?: string | null
    images?: { url: string; publicId: string }[]
    with_poll?: boolean
  }
  const { topic_id, content, parent_post_id = null, images, with_poll } = body

  const hasImages = images && images.length > 0
  if (!hasImages && (!content || !content.trim())) {
    return NextResponse.json({ error: 'Yanıt boş olamaz.' }, { status: 400 })
  }
  if (!topic_id) {
    return NextResponse.json({ error: 'topic_id gerekli.' }, { status: 400 })
  }

  const { data: topicData } = await supabase
    .from('topics')
    .select('id, status, author_id')
    .eq('id', topic_id)
    .single()

  const topic = topicData as Pick<Topic, 'id' | 'status' | 'author_id'> | null
  if (!topic || topic.status !== 'approved') {
    return NextResponse.json({ error: 'Konu bulunamadı.' }, { status: 404 })
  }

  const { data: postData, error: postError } = await supabase
    .from('posts')
    .insert({
      topic_id,
      author_id: user.id,
      content: content?.trim() ?? '',
      parent_post_id: parent_post_id ?? null,
      is_deleted: false,
    })
    .select()
    .single()

  if (postError) {
    return NextResponse.json({ error: 'Yanıt gönderilemedi.' }, { status: 500 })
  }

  const post = postData as Post

  // Insert image records
  let savedImages: ImageRow[] = []
  if (images && images.length > 0) {
    const imageInserts = images.map((img) => ({
      uploader_id: user.id,
      cloudinary_url: img.url,
      cloudinary_id: img.publicId,
      post_id: post.id,
      topic_id: null,
    }))

    const { data: imgData } = await supabase
      .from('images')
      .insert(imageInserts)
      .select()

    savedImages = (imgData ?? []) as ImageRow[]
  }

  // Create poll attached to this post if requested
  let savedPoll: Poll | null = null
  if (with_poll) {
    const { data: pollData } = await supabase
      .from('polls')
      .insert({ post_id: post.id, question: 'Bu rotanın derecesi nedir?' })
      .select()
      .single()
    savedPoll = pollData as Poll | null
  }

  await supabase
    .from('topic_reads')
    .upsert({ user_id: user.id, topic_id, last_read_at: new Date().toISOString() })

  // Notify topic author of any new reply
  if (topic.author_id !== user.id) {
    await supabase.from('notifications').insert({
      user_id: topic.author_id,
      type: 'reply_received',
      reference_id: topic_id,
      is_read: false,
    })
  }

  // Notify parent post author when this is a direct reply to their post
  // (skip if they are already the topic author — they got reply_received above)
  if (parent_post_id) {
    const { data: parentData } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', parent_post_id)
      .single()
    const parentAuthorId = (parentData as { author_id: string } | null)?.author_id
    if (parentAuthorId && parentAuthorId !== user.id && parentAuthorId !== topic.author_id) {
      await supabase.from('notifications').insert({
        user_id: parentAuthorId,
        type: 'reply_to_post',
        reference_id: topic_id,
        is_read: false,
      })
    }
  }

  // Notify @mentioned users
  const mentionRe = /(?<!\w)@([a-zA-Z0-9_]+)/g
  const mentionedUsernames: string[] = []
  let m: RegExpExecArray | null
  while (content && (m = mentionRe.exec(content)) !== null) mentionedUsernames.push(m[1])
  const uniqueUsernames = [...new Set(mentionedUsernames)]

  if (uniqueUsernames.length > 0) {
    const { data: mentionedProfiles } = await supabase
      .from('profiles')
      .select('id')
      .in('username', uniqueUsernames)
    const mentionIds = ((mentionedProfiles ?? []) as { id: string }[])
      .map((p) => p.id)
      .filter((id) => id !== user.id)
    if (mentionIds.length > 0) {
      await supabase.from('notifications').insert(
        mentionIds.map((id) => ({
          user_id: id,
          type: 'mention_received',
          reference_id: topic_id,
          is_read: false,
        }))
      )
    }
  }

  return NextResponse.json({ success: true, post, images: savedImages, poll: savedPoll })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { post_id, content } = await request.json() as { post_id: string; content: string }
  if (!post_id || !content?.trim()) return NextResponse.json({ error: 'Eksik alan.' }, { status: 400 })

  const { data: postData } = await supabase.from('posts').select('author_id').eq('id', post_id).single()
  const post = postData as Pick<Post, 'author_id'> | null
  if (!post) return NextResponse.json({ error: 'Yanıt bulunamadı.' }, { status: 404 })

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileData as Pick<Profile, 'role'> | null
  if (post.author_id !== user.id && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 403 })
  }

  const service = await createServiceClient()
  const { error } = await service.from('posts').update({ content: content.trim(), updated_at: new Date().toISOString() }).eq('id', post_id)
  if (error) return NextResponse.json({ error: 'Güncelleme başarısız.' }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { post_id } = await request.json() as { post_id: string }
  if (!post_id) return NextResponse.json({ error: 'Eksik alan.' }, { status: 400 })

  const { data: postData } = await supabase.from('posts').select('author_id, topic_id').eq('id', post_id).single()
  const post = postData as Pick<Post, 'author_id' | 'topic_id'> | null
  if (!post) return NextResponse.json({ error: 'Yanıt bulunamadı.' }, { status: 404 })

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileData as Pick<Profile, 'role'> | null
  if (post.author_id !== user.id && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 403 })
  }

  const service = await createServiceClient()
  const { error } = await service.from('posts').update({ is_deleted: true }).eq('id', post_id)
  if (error) return NextResponse.json({ error: 'Silme başarısız.' }, { status: 500 })

  // If no remaining posts in this topic, delete the topic too
  const { count } = await service
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('topic_id', post.topic_id)
    .eq('is_deleted', false)

  if (count === 0) {
    await service.from('notifications').delete().eq('reference_id', post.topic_id)
    await service.from('topics').delete().eq('id', post.topic_id)
    return NextResponse.json({ success: true, topicDeleted: true })
  }

  return NextResponse.json({ success: true, topicDeleted: false })
}
