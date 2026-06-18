import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Profile, Page } from '@/types/database'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('pages').select('content').eq('slug', 'rules').single()
    const page = data as Pick<Page, 'content'> | null
    return NextResponse.json({ content: page?.content ?? '' })
  } catch {
    return NextResponse.json({ content: '' })
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

    const body = await request.json() as { content: string }
    if (typeof body.content !== 'string') return NextResponse.json({ error: 'Content required' }, { status: 400 })

    await supabase.from('pages').upsert({
      slug: 'rules',
      title: 'Barek Bouldering Kuralları',
      content: body.content,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
