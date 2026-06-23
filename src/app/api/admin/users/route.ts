import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: callerData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const caller = callerData as Pick<Profile, 'role'> | null
    if (!caller || caller.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as { userId: string; action: 'approve' | 'reject' }
    const { userId, action } = body
    if (!userId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const service = createServiceClient()
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    await service.from('profiles').update({ status: newStatus }).eq('id', userId)

    if (action === 'approve') {
      await service.from('notifications').insert({
        user_id: userId,
        type: 'user_approved',
        reference_id: null,
        is_read: false,
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
