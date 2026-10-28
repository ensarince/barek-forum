import type { SupabaseClient } from '@supabase/supabase-js'

// Counts are done in SQL (see supabase/migrations/20261028_count_functions.sql).
// Fallback to counting rows in JS if the functions aren't deployed yet.

export async function getReplyCounts(supabase: SupabaseClient, topicIds: string[]): Promise<Record<string, number>> {
  if (topicIds.length === 0) return {}

  const { data, error } = await supabase.rpc('topic_reply_counts', { topic_ids: topicIds })
  if (!error) {
    return Object.fromEntries(((data ?? []) as { topic_id: string; reply_count: number }[]).map((r) => [r.topic_id, Number(r.reply_count)]))
  }

  const { data: rows } = await supabase.from('posts').select('topic_id').in('topic_id', topicIds).eq('is_deleted', false)
  return ((rows ?? []) as { topic_id: string }[]).reduce<Record<string, number>>((acc, p) => {
    acc[p.topic_id] = (acc[p.topic_id] ?? 0) + 1
    return acc
  }, {})
}

export async function getSectorTopicCounts(supabase: SupabaseClient): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('sector_topic_counts')
  if (!error) {
    return Object.fromEntries(((data ?? []) as { sector_id: string; topic_count: number }[]).map((r) => [r.sector_id, Number(r.topic_count)]))
  }

  const { data: rows } = await supabase.from('topics').select('sector_id').eq('status', 'approved').not('sector_id', 'is', null)
  return ((rows ?? []) as { sector_id: string }[]).reduce<Record<string, number>>((acc, t) => {
    acc[t.sector_id] = (acc[t.sector_id] ?? 0) + 1
    return acc
  }, {})
}
