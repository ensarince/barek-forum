import { notFound } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

type RoleStatus = { role?: string | null; status?: string | null } | null | undefined

/** Admin rights need role admin AND an approved account — a rejected admin loses them. */
export function isActiveAdmin(profile: RoleStatus): boolean {
  return profile?.role === 'admin' && profile?.status === 'approved'
}

/** Load the caller's role/status; null when logged out. */
export async function getCallerRole(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from('profiles').select('role, status').eq('id', userId).single()
  return data as { role: string; status: string } | null
}

/**
 * Server-component guard for admin pages. Each page calls it itself — Next 16 can render a
 * page on client navigation without re-running the admin layout, so the layout alone isn't enough.
 */
export async function requireAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isActiveAdmin(await getCallerRole(supabase, user.id))) notFound()
  return { supabase, user }
}
