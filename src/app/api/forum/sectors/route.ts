import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Sector } from '@/types/database'

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sectors')
    .select('*')
    .order('order_index')

  return NextResponse.json((data ?? []) as Sector[])
}
