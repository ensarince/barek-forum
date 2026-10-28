import { createServiceClient } from '@/lib/supabase/server'
import { emailUserMentioned } from '@/lib/email'

const MENTION_RE = /(?<!\w)@([a-zA-Z0-9_]+)/g

export function parseMentions(content: string, max = 5): string[] {
  const names: string[] = []
  for (const m of content.matchAll(MENTION_RE)) names.push(m[1])
  return [...new Set(names)].slice(0, max)
}

/**
 * Notify (in-app + email) approved users @mentioned in a topic's opening post.
 * Called when a topic goes live: on creation for admins/announcements, on approval for everyone else.
 */
export async function notifyTopicMentions(opts: {
  topicId: string
  title: string
  content: string
  authorId: string
  authorUsername: string
}) {
  const usernames = parseMentions(opts.content)
  if (usernames.length === 0) return

  const service = createServiceClient()
  const { data } = await service
    .from('profiles')
    .select('id, username')
    .in('username', usernames)
    .eq('status', 'approved')
  const mentioned = ((data ?? []) as { id: string; username: string }[]).filter((p) => p.id !== opts.authorId)
  if (mentioned.length === 0) return

  await service.from('notifications').insert(
    mentioned.map(({ id }) => ({ user_id: id, type: 'mention_received', reference_id: opts.topicId, is_read: false }))
  )
  await Promise.all(
    mentioned.map(({ id, username }) =>
      emailUserMentioned(id, username, opts.authorUsername || 'kullanıcı', opts.title, opts.topicId)
    )
  )
}
