import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ users: [] })

  let query = supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('status', 'approved')
    .neq('id', user.id)
    .order('username')
    .limit(8)

  if (q.trim()) {
    query = query.ilike('username', `${q.trim()}%`)
  }

  const { data } = await query
  return NextResponse.json({ users: (data ?? []) as Pick<Profile, 'username' | 'avatar_url'>[] })
}
