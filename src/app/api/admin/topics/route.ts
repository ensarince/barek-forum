import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Profile, Topic } from '@/types/database'

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

    await supabase.from('posts').delete().eq('topic_id', topicId)
    await supabase.from('notifications').delete().eq('reference_id', topicId)
    await supabase.from('topics').delete().eq('id', topicId)

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

    const { data: topicData } = await supabase.from('topics').select('author_id').eq('id', topicId).single()
    const topic = topicData as Pick<Topic, 'author_id'> | null

    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    await supabase.from('topics').update({
      status: newStatus,
      approved_by: action === 'approve' ? user.id : null,
      approved_at: action === 'approve' ? new Date().toISOString() : null,
    }).eq('id', topicId)

    if (topic) {
      await supabase.from('notifications').insert({
        user_id: topic.author_id,
        type: action === 'approve' ? 'topic_approved' : 'topic_rejected',
        reference_id: topicId,
        is_read: false,
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
