import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GRADES } from '@/lib/grades'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { poll_id?: string; grade?: string }
  const { poll_id, grade } = body

  if (!poll_id || !grade) return NextResponse.json({ error: 'Eksik alan.' }, { status: 400 })
  if (!GRADES.includes(grade)) return NextResponse.json({ error: 'Geçersiz derece.' }, { status: 400 })

  const { error } = await supabase
    .from('poll_votes')
    .upsert({ poll_id, user_id: user.id, grade }, { onConflict: 'poll_id,user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
