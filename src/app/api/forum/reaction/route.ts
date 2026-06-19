import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { emoji, topic_id, post_id } = await request.json() as {
    emoji: string
    topic_id?: string
    post_id?: string
  }

  if (!emoji || (!topic_id && !post_id)) {
    return NextResponse.json({ error: 'Eksik alan.' }, { status: 400 })
  }

  let checkQuery = supabase
    .from('reactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('emoji', emoji)

  if (topic_id) {
    checkQuery = checkQuery.eq('topic_id', topic_id).is('post_id', null)
  } else {
    checkQuery = checkQuery.eq('post_id', post_id!).is('topic_id', null)
  }

  const { data: existing } = await checkQuery.maybeSingle()

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id)
    return NextResponse.json({ reacted: false })
  }

  await supabase.from('reactions').insert({
    user_id: user.id,
    emoji,
    topic_id: topic_id ?? null,
    post_id: post_id ?? null,
  })
  return NextResponse.json({ reacted: true })
}
