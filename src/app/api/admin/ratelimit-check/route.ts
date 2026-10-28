import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitHealth } from '@/lib/rateLimit'
import type { Profile } from '@/types/database'

// Admin-only: shows whether the Upstash rate limiter is configured and reachable.
// Never returns the URL or token themselves.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profileData as Pick<Profile, 'role'> | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(await rateLimitHealth(), { headers: { 'Cache-Control': 'no-store' } })
}
