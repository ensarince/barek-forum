import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from '@/lib/utils'
import { MessageSquare, Pin } from 'lucide-react'
import RefreshButton from '@/components/forum/RefreshButton'
import type { TopicWithMeta, TopicRead } from '@/types/database'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

export default async function FeedPage() {
  if (!SUPABASE_CONFIGURED) {
    return <PreviewFeed />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: topicsRaw } = await supabase
    .from('topics')
    .select(`
      *,
      author:profiles!topics_author_id_fkey(username, avatar_url),
      sector:sectors(name)
    `)
    .eq('status', 'approved')
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(50)

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

  const { data: readsRaw } = await supabase
    .from('topic_reads')
    .select('topic_id, last_read_at')
    .eq('user_id', user!.id)
    .in('topic_id', safeIds)

  const reads = (readsRaw ?? []) as Pick<TopicRead, 'topic_id' | 'last_read_at'>[]
  const readMap = reads.reduce<Record<string, string>>((acc, r) => {
    acc[r.topic_id] = r.last_read_at
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1">
          <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b]">Son Tartışmalar</h2>
          <RefreshButton />
        </div>
        <Link
          href="/topics/new"
          className="text-xs uppercase tracking-widest bg-[#8b1a1a] hover:bg-[#a82020] text-white px-4 py-2 transition-colors"
        >
          + Yeni Konu
        </Link>
      </div>

      <div className="divide-y divide-[#2a2a2a]">
        {topics.map((topic) => {
          const lastRead = readMap[topic.id]
          const isUnread = !lastRead || new Date(topic.updated_at) > new Date(lastRead)
          const replyCount = countMap[topic.id] ?? 0

          return (
            <Link
              key={topic.id}
              href={`/topics/${topic.id}`}
              className="flex items-start gap-4 py-4 hover:bg-[#161616] -mx-4 px-4 transition-colors"
            >
              <div className="mt-2 shrink-0">
                <div className={`w-1.5 h-1.5 rounded-full ${isUnread ? 'bg-[#c0392b]' : 'bg-transparent'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {topic.is_pinned && <Pin size={11} className="text-[#8b1a1a] shrink-0" />}
                  {topic.type === 'announcement' && (
                    <span className="text-[9px] uppercase tracking-widest bg-[#8b1a1a] text-white px-1.5 py-0.5">
                      Duyuru
                    </span>
                  )}
                  {topic.sector ? (
                    <span className="text-[10px] uppercase tracking-wider text-[#6b6b6b] border border-[#2a2a2a] px-1.5 py-0.5">
                      {topic.sector.name}
                    </span>
                  ) : topic.tag ? (
                    <span className="text-[10px] uppercase tracking-wider text-[#6b6b6b] border border-dashed border-[#2a2a2a] px-1.5 py-0.5">
                      {topic.tag}
                    </span>
                  ) : null}
                </div>

                <p className={`text-sm leading-snug truncate ${isUnread ? 'font-semibold text-white' : 'text-[#c8c8c8]'}`}>
                  {topic.title}
                </p>

                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#6b6b6b]">
                  <span>{topic.author?.username ?? 'bilinmiyor'}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={11} />
                    {replyCount}
                  </span>
                  <span>·</span>
                  <span>{formatDistanceToNow(topic.updated_at)}</span>
                </div>
              </div>
            </Link>
          )
        })}

        {topics.length === 0 && (
          <p className="text-[#6b6b6b] text-sm py-8 text-center">Henüz konu yok.</p>
        )}
      </div>
    </div>
  )
}

const PREVIEW_TOPICS = [
  { id: '1', title: 'Ana Duvar — yeni güzergahlar hakkında', sector: 'Ana Duvar', author: 'kemal_tas', replies: 7, ago: '2s önce', unread: true, pinned: false, type: 'discussion' },
  { id: '2', title: '2024 sezon açılışı duyurusu', sector: null, author: 'admin', replies: 12, ago: '1g önce', unread: true, pinned: true, type: 'announcement' },
  { id: '3', title: 'Mağara Sektörü — projeksiyon beta sorusu', sector: 'Mağara Sektörü', author: 'ayse_kaya', replies: 3, ago: '3g önce', unread: false, pinned: false, type: 'discussion' },
  { id: '4', title: 'Bouldering matı tavsiyesi?', sector: 'Ana Duvar', author: 'fatih_climb', replies: 9, ago: '1h önce', unread: false, pinned: false, type: 'discussion' },
  { id: '5', title: 'Sol Kanat — taş temizliği yapıldı', sector: 'Sol Kanat', author: 'murat_b', replies: 1, ago: '2h önce', unread: true, pinned: false, type: 'discussion' },
]

function PreviewFeed() {
  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b]">Son Tartışmalar</h2>
        <Link href="/topics/new" className="text-xs uppercase tracking-widest bg-[#8b1a1a] hover:bg-[#a82020] text-white px-4 py-2 transition-colors">
          + Yeni Konu
        </Link>
      </div>

      <div className="divide-y divide-[#2a2a2a]">
        {PREVIEW_TOPICS.map((topic) => (
          <div key={topic.id} className="flex items-start gap-4 py-4 hover:bg-[#161616] -mx-4 px-4 transition-colors cursor-pointer">
            <div className="mt-2 shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${topic.unread ? 'bg-[#c0392b]' : 'bg-transparent'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {topic.pinned && <Pin size={11} className="text-[#8b1a1a] shrink-0" />}
                {topic.type === 'announcement' && (
                  <span className="text-[9px] uppercase tracking-widest bg-[#8b1a1a] text-white px-1.5 py-0.5">Duyuru</span>
                )}
                {topic.sector && (
                  <span className="text-[10px] uppercase tracking-wider text-[#6b6b6b] border border-[#2a2a2a] px-1.5 py-0.5">{topic.sector}</span>
                )}
              </div>
              <p className={`text-sm leading-snug truncate ${topic.unread ? 'font-semibold text-white' : 'text-[#c8c8c8]'}`}>
                {topic.title}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#6b6b6b]">
                <span>{topic.author}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><MessageSquare size={11} />{topic.replies}</span>
                <span>·</span>
                <span>{topic.ago}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
