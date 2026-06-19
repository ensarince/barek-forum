import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function isValidUrl(val: string): boolean {
  return val.startsWith('https://')
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 })

  const body = await request.json() as Record<string, unknown>

  const urlFields = ['eight_a_url', 'topo_url', 'instagram_url', 'youtube_url'] as const
  for (const field of urlFields) {
    const val = body[field]
    if (val && typeof val === 'string' && val.trim() !== '' && !isValidUrl(val.trim())) {
      return NextResponse.json({ error: `${field}: https:// ile başlamalı` }, { status: 400 })
    }
  }

  const update: Record<string, string | null> = {}

  if (typeof body.full_name === 'string') {
    update.full_name = body.full_name.trim() || null
  }
  if (typeof body.avatar_url === 'string') {
    update.avatar_url = body.avatar_url.trim() || null
  }
  for (const field of urlFields) {
    if (typeof body[field] === 'string') {
      update[field] = (body[field] as string).trim() || null
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
