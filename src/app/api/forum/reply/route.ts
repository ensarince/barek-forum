import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Topic, Post } from '@/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { topic_id?: string; content?: string; parent_post_id?: string | null }
  const { topic_id, content, parent_post_id = null } = body

  if (!content || content.trim().length < 10) {
    return NextResponse.json({ error: 'Yanıt en az 10 karakter olmalı.' }, { status: 400 })
  }
  if (!topic_id) {
    return NextResponse.json({ error: 'topic_id gerekli.' }, { status: 400 })
  }

  // Check topic exists and is approved
  const { data: topicData } = await supabase
    .from('topics')
    .select('id, status, author_id')
    .eq('id', topic_id)
    .single()

  const topic = topicData as Pick<Topic, 'id' | 'status' | 'author_id'> | null
  if (!topic || topic.status !== 'approved') {
    return NextResponse.json({ error: 'Konu bulunamadı.' }, { status: 404 })
  }

  // Insert reply
  const { data: postData, error: postError } = await supabase
    .from('posts')
    .insert({ topic_id, author_id: user.id, content: content.trim(), parent_post_id: parent_post_id ?? null, is_deleted: false })
    .select()
    .single()

  if (postError) {
    return NextResponse.json({ error: 'Yanıt gönderilemedi.' }, { status: 500 })
  }

  const post = postData as Post

  // Upsert topic_reads for this user
  await supabase
    .from('topic_reads')
    .upsert({ user_id: user.id, topic_id, last_read_at: new Date().toISOString() })

  // Notify topic author if different from replier
  if (topic.author_id !== user.id) {
    await supabase.from('notifications').insert({
      user_id: topic.author_id,
      type: 'reply_received',
      reference_id: topic_id,
      is_read: false,
    })
  }

  return NextResponse.json({ success: true, post })
}
