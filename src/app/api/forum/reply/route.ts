import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Topic, Post, Image as ImageRow, Poll } from '@/types/database'

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

  if (!content || !content.trim()) {
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
      content: content.trim(),
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

  if (topic.author_id !== user.id) {
    await supabase.from('notifications').insert({
      user_id: topic.author_id,
      type: 'reply_received',
      reference_id: topic_id,
      is_read: false,
    })
  }

  return NextResponse.json({ success: true, post, images: savedImages, poll: savedPoll })
}
