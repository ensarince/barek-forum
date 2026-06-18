import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Profile, Sector } from '@/types/database'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401, supabase: null }
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = data as Pick<Profile, 'role'> | null
  if (!profile || profile.role !== 'admin') return { error: 'Forbidden', status: 403, supabase: null }
  return { error: null, status: 200, supabase }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('sectors').select('*').order('order_index')
    return NextResponse.json((data ?? []) as Sector[])
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error, status, supabase } = await requireAdmin()
  if (error || !supabase) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json() as { name: string; description?: string }
    if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const { data: existing } = await supabase.from('sectors').select('order_index').order('order_index', { ascending: false }).limit(1)
    const maxIndex = (existing as { order_index: number }[] | null)?.[0]?.order_index ?? -1

    const { data, error: insertError } = await supabase.from('sectors').insert({
      name: body.name.trim(),
      description: body.description ?? null,
      order_index: maxIndex + 1,
    }).select().single()

    if (insertError) throw insertError
    return NextResponse.json(data as Sector)
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const { error, status, supabase } = await requireAdmin()
  if (error || !supabase) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json() as { id: string; name?: string; description?: string | null; order_index?: number }
    if (!body.id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const update: Partial<Sector> = {}
    if (body.name !== undefined) update.name = body.name
    if (body.description !== undefined) update.description = body.description
    if (body.order_index !== undefined) update.order_index = body.order_index

    await supabase.from('sectors').update(update).eq('id', body.id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { error, status, supabase } = await requireAdmin()
  if (error || !supabase) return NextResponse.json({ error }, { status })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await supabase.from('sectors').delete().eq('id', id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
