import type { SupabaseClient } from '@supabase/supabase-js'
import type { TopicWithMeta } from '@/types/database'

export const TOPICS_PER_PAGE = 20

const TOPIC_SELECT = `
  *,
  author:profiles!topics_author_id_fkey(username, avatar_url),
  sector:sectors(name)
`

/** Reads `?sayfa=N` — anything missing or invalid means page 1 */
export function parsePage(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value)
  return Number.isInteger(n) && n > 1 ? n : 1
}

/**
 * One page of approved topics, newest activity first.
 * Pinned topics are shown only on page 1 (above the rest), so they don't repeat on every page.
 */
export async function getTopicsPage(
  supabase: SupabaseClient,
  { page, sectorId }: { page: number; sectorId?: string }
): Promise<{ topics: TopicWithMeta[]; totalPages: number }> {
  const from = (page - 1) * TOPICS_PER_PAGE

  let listQuery = supabase
    .from('topics')
    .select(TOPIC_SELECT, { count: 'exact' })
    .eq('status', 'approved')
    .eq('is_pinned', false)
  if (sectorId) listQuery = listQuery.eq('sector_id', sectorId)

  let pinnedQuery = supabase
    .from('topics')
    .select(TOPIC_SELECT)
    .eq('status', 'approved')
    .eq('is_pinned', true)
  if (sectorId) pinnedQuery = pinnedQuery.eq('sector_id', sectorId)

  const [list, pinned] = await Promise.all([
    listQuery.order('updated_at', { ascending: false }).range(from, from + TOPICS_PER_PAGE - 1),
    page === 1 ? pinnedQuery.order('updated_at', { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
  ])

  const totalPages = Math.max(1, Math.ceil((list.count ?? 0) / TOPICS_PER_PAGE))

  return {
    topics: [...((pinned.data ?? []) as TopicWithMeta[]), ...((list.data ?? []) as TopicWithMeta[])],
    totalPages,
  }
}
