import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Profile, Topic } from '@/types/database'
import { emailUserTopicApproved, emailUserTopicRejected } from '@/lib/email'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: callerData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const caller = callerData as Pick<Profile, 'role'> | null
    if (!caller || caller.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { topicId } = await request.json() as { topicId: string }
    if (!topicId) return NextResponse.json({ error: 'Missing topicId' }, { status: 400 })

    const service = createServiceClient()
    await service.from('posts').delete().eq('topic_id', topicId)
    await service.from('notifications').delete().eq('reference_id', topicId)
    await service.from('topics').delete().eq('id', topicId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: callerData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const caller = callerData as Pick<Profile, 'role'> | null
    if (!caller || caller.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as { topicId: string; action: 'approve' | 'reject' }
    const { topicId, action } = body
    if (!topicId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const service = createServiceClient()
    const { data: topicData } = await service.from('topics').select('author_id, title').eq('id', topicId).single()
    const topic = topicData as Pick<Topic, 'author_id' | 'title'> | null

    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    await service.from('topics').update({
      status: newStatus,
      approved_by: action === 'approve' ? user.id : null,
      approved_at: action === 'approve' ? new Date().toISOString() : null,
    }).eq('id', topicId)

    if (topic) {
      await service.from('notifications').insert({
        user_id: topic.author_id,
        type: action === 'approve' ? 'topic_approved' : 'topic_rejected',
        reference_id: topicId,
        is_read: false,
      })

      const { data: authorProfile } = await service.from('profiles').select('username').eq('id', topic.author_id).single()
      const authorUsername = (authorProfile as { username: string } | null)?.username ?? topic.author_id

      await (action === 'approve'
        ? emailUserTopicApproved(topic.author_id, authorUsername, topic.title, topicId)
        : emailUserTopicRejected(topic.author_id, authorUsername, topic.title))
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
