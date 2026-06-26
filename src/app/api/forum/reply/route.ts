import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Topic, Post, Image as ImageRow, Poll, Profile } from '@/types/database'
import { emailUserNewReply, emailUserMentioned } from '@/lib/email'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profileData } = await supabase.from('profiles').select('status, username').eq('id', user.id).single()
  if (!profileData || (profileData as { status: string }).status !== 'approved') {
    return NextResponse.json({ error: 'Hesabın onaylı değil.' }, { status: 403 })
  }
  const currentUsername = (profileData as { username: string }).username

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
    .select('id, status, author_id, title')
    .eq('id', topic_id)
    .single()

  const topic = topicData as Pick<Topic, 'id' | 'status' | 'author_id' | 'title'> | null
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

  // All notification inserts go via service client — the RLS policy
  // "notifications_own" blocks INSERT when user_id != auth.uid()
  const service = createServiceClient()

  // Bump topic's updated_at so it surfaces at the top of the feed
  await service.from('topics').update({ updated_at: new Date().toISOString() }).eq('id', topic_id)

  // Notify topic author of any new reply
  if (topic.author_id !== user.id) {
    await service.from('notifications').insert({
      user_id: topic.author_id,
      type: 'reply_received',
      reference_id: topic_id,
      is_read: false,
    })
  }

  // Notify parent post author when this is a direct reply to their post
  // BUG 5 FIX: hoist parentAuthorId so the email section can reference it
  let parentAuthorId: string | null = null
  if (parent_post_id) {
    const { data: parentData } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', parent_post_id)
      .single()
    parentAuthorId = (parentData as { author_id: string } | null)?.author_id ?? null
    if (parentAuthorId && parentAuthorId !== user.id && parentAuthorId !== topic.author_id) {
      await service.from('notifications').insert({
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

  let mentionedUsers: { id: string; username: string }[] = []
  if (uniqueUsernames.length > 0) {
    const { data: mentionedProfiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('username', uniqueUsernames)
    mentionedUsers = ((mentionedProfiles ?? []) as { id: string; username: string }[])
      .filter((p) => p.id !== user.id)
    if (mentionedUsers.length > 0) {
      await service.from('notifications').insert(
        mentionedUsers.map(({ id }) => ({
          user_id: id,
          type: 'mention_received',
          reference_id: topic_id,
          is_read: false,
        }))
      )
    }
  }

  // Fire emails (parallel, after all DB work is done)
  const emailTasks: Promise<void>[] = []

  if (topic.author_id !== user.id) {
    const { data: authorProfile } = await service.from('profiles').select('username').eq('id', topic.author_id).single()
    const authorUsername = (authorProfile as { username: string } | null)?.username ?? topic.author_id
    emailTasks.push(emailUserNewReply(topic.author_id, authorUsername, currentUsername, topic.title, topic_id))
  }

  // BUG 5 FIX: email the parent post author too (they already got in-app reply_to_post)
  if (parentAuthorId && parentAuthorId !== user.id && parentAuthorId !== topic.author_id) {
    const { data: parentProfile } = await service.from('profiles').select('username').eq('id', parentAuthorId).single()
    const parentUsername = (parentProfile as { username: string } | null)?.username ?? parentAuthorId
    emailTasks.push(emailUserNewReply(parentAuthorId, parentUsername, currentUsername, topic.title, topic_id))
  }

  for (const mentioned of mentionedUsers) {
    // BUG 1 FIX: skip topic author if they already got a reply email above — no duplicates
    if (mentioned.id === topic.author_id && topic.author_id !== user.id) continue
    emailTasks.push(emailUserMentioned(mentioned.id, mentioned.username, currentUsername, topic.title, topic_id))
  }

  await Promise.all(emailTasks)

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

  const service = createServiceClient()
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

  const service = createServiceClient()
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
