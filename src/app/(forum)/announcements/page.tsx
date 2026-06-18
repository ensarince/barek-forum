import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from '@/lib/utils'
import { MessageSquare, Pin } from 'lucide-react'
import type { TopicWithMeta } from '@/types/database'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

export default async function AnnouncementsPage() {
  if (!SUPABASE_CONFIGURED) {
    return <PreviewAnnouncements />
  }

  const supabase = await createClient()

  const { data: topicsRaw } = await supabase
    .from('topics')
    .select(`
      *,
      author:profiles!topics_author_id_fkey(username, avatar_url),
      sector:sectors(name)
    `)
    .eq('status', 'approved')
    .eq('type', 'announcement')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  const topics = (topicsRaw ?? []) as TopicWithMeta[]

  const topicIds = topics.map((t) => t.id)
  const safeIds = topicIds.length > 0 ? topicIds : ['_none']

  const { data: replyCountsRaw } = await supabase
    .from('posts')
    .select('topic_id')
    .in('topic_id', safeIds)
    .eq('is_deleted', false)

  const replyCounts = (replyCountsRaw ?? []) as { topic_id: string }[]
  const countMap = replyCounts.reduce<Record<string, number>>((acc, p) => {
    acc[p.topic_id] = (acc[p.topic_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-6">Duyurular</h2>

      <div className="divide-y divide-[#2a2a2a]">
        {topics.map((topic) => (
          <Link
            key={topic.id}
            href={`/topics/${topic.id}`}
            className="flex items-start gap-4 py-4 hover:bg-[#161616] -mx-4 px-4 transition-colors"
          >
            <div className="mt-2 shrink-0 text-[#8b1a1a]">
              {topic.is_pinned ? <Pin size={13} /> : <span className="w-3 h-3 block" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-snug truncate">{topic.title}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#6b6b6b]">
                <span>{topic.author?.username ?? 'admin'}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><MessageSquare size={11} />{countMap[topic.id] ?? 0}</span>
                <span>·</span>
                <span>{formatDistanceToNow(topic.created_at)}</span>
              </div>
            </div>
          </Link>
        ))}
        {topics.length === 0 && (
          <p className="text-[#6b6b6b] text-sm py-8 text-center">Henüz duyuru yok.</p>
        )}
      </div>
    </div>
  )
}

function PreviewAnnouncements() {
  const items = [
    { id: '1', title: '2024 Sezon Açılışı — 15 Mart', author: 'admin', replies: 12, ago: '1g önce', pinned: true },
    { id: '2', title: 'Alan bakımı — bu hafta sonu temizlik', author: 'admin', replies: 4, ago: '3g önce', pinned: false },
    { id: '3', title: 'Yeni sektör haritası yayınlandı', author: 'admin', replies: 7, ago: '1h önce', pinned: false },
  ]
  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-6">Duyurular</h2>
      <div className="divide-y divide-[#2a2a2a]">
        {items.map((t) => (
          <div key={t.id} className="flex items-start gap-4 py-4 hover:bg-[#161616] -mx-4 px-4 transition-colors cursor-pointer">
            <div className="mt-2 shrink-0 text-[#8b1a1a]">
              {t.pinned ? <Pin size={13} /> : <span className="w-3 h-3 block" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-snug truncate">{t.title}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#6b6b6b]">
                <span>{t.author}</span><span>·</span>
                <span className="flex items-center gap-1"><MessageSquare size={11} />{t.replies}</span>
                <span>·</span><span>{t.ago}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
