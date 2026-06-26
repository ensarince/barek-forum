import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GRADES } from '@/lib/grades'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only approved users may vote
  const { data: profileData } = await supabase.from('profiles').select('status').eq('id', user.id).single()
  if (!profileData || (profileData as { status: string }).status !== 'approved') {
    return NextResponse.json({ error: 'Hesabın onaylı değil.' }, { status: 403 })
  }

  const body = await request.json() as { poll_id?: string; grade?: string }
  const { poll_id, grade } = body

  if (!poll_id || !grade) return NextResponse.json({ error: 'Eksik alan.' }, { status: 400 })
  if (!GRADES.includes(grade)) return NextResponse.json({ error: 'Geçersiz derece.' }, { status: 400 })

  // Only allow votes on polls attached to approved topics
  const { data: pollRow } = await supabase
    .from('polls')
    .select('topic_id, post_id')
    .eq('id', poll_id)
    .single()

  if (!pollRow) return NextResponse.json({ error: 'Anket bulunamadı.' }, { status: 404 })

  const pr = pollRow as { topic_id: string | null; post_id: string | null }
  let resolvedTopicId: string | null = pr.topic_id

  if (!resolvedTopicId && pr.post_id) {
    const { data: postRow } = await supabase
      .from('posts')
      .select('topic_id')
      .eq('id', pr.post_id)
      .single()
    resolvedTopicId = (postRow as { topic_id: string } | null)?.topic_id ?? null
  }

  if (resolvedTopicId) {
    const { data: topicRow } = await supabase
      .from('topics')
      .select('status')
      .eq('id', resolvedTopicId)
      .single()
    if (!topicRow || (topicRow as { status: string }).status !== 'approved') {
      return NextResponse.json({ error: 'Konu onaylı değil.' }, { status: 403 })
    }
  }

  const { error } = await supabase
    .from('poll_votes')
    .upsert({ poll_id, user_id: user.id, grade }, { onConflict: 'poll_id,user_id' })

  if (error) return NextResponse.json({ error: 'Oy kaydedilemedi.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
