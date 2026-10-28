import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import Pagination from '@/components/forum/Pagination'
import { getTopicsPage, parsePage } from '@/lib/topicPages'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from '@/lib/utils'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import RefreshButton from '@/components/forum/RefreshButton'
import { getReplyCounts } from '@/lib/counts'
import type { Sector, TopicRead } from '@/types/database'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

interface PageProps {
  params: Promise<{ sectorId: string }>
  searchParams: Promise<{ sayfa?: string | string[] }>
}

export default async function SectorPage({ params, searchParams }: PageProps) {
  const { sectorId } = await params
  const page = parsePage((await searchParams).sayfa)

  if (!SUPABASE_CONFIGURED) {
    return <PreviewSector />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sectorData } = await supabase
    .from('sectors')
    .select('*')
    .eq('id', sectorId)
    .single()

  if (!sectorData) notFound()
  const sector = sectorData as Sector

  const basePath = `/sectors/${sectorId}`
  const { topics, totalPages } = await getTopicsPage(supabase, { page, sectorId })
  // e.g. ?sayfa=99 after topics were deleted — go to the last real page
  if (page > totalPages) redirect(totalPages > 1 ? `${basePath}?sayfa=${totalPages}` : basePath)

  const topicIds = topics.map((t) => t.id)
  const safeIds = topicIds.length > 0 ? topicIds : ['_none']

  const countMap = await getReplyCounts(supabase, topicIds)

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
      <Link href="/" className="inline-flex items-center gap-1.5 text-[11px] text-[#8a8a8a] hover:text-white transition-colors mb-4">
        <ArrowLeft size={12} />
        Ana Sayfa
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8a8a8a] mb-0.5">Sektör</p>
            <h1 className="text-lg font-bold text-white uppercase tracking-wider">{sector.name}</h1>
          </div>
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
                <p className={`text-sm leading-snug truncate ${isUnread ? 'font-semibold text-white' : 'text-[#c8c8c8]'}`}>
                  {topic.title}
                </p>
                <div className="flex items-center gap-x-3 gap-y-0 flex-wrap mt-1.5 text-[11px] text-[#8a8a8a]">
                  <span className="truncate max-w-[10rem]">{topic.author?.username ?? 'bilinmiyor'}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1 shrink-0"><MessageSquare size={11} />{replyCount}</span>
                  <span>·</span>
                  <span className="shrink-0">{formatDistanceToNow(topic.updated_at)}</span>
                </div>
              </div>
            </Link>
          )
        })}
        {topics.length === 0 && (
          <p className="text-[#8a8a8a] text-sm py-8 text-center">Bu sektörde henüz konu yok.</p>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} basePath={basePath} />
    </div>
  )
}

function PreviewSector() {
  const items = [
    { id: '1', title: 'Ana Duvar 7A projeksiyonu beta', unread: true, author: 'kemal_tas', replies: 5, ago: '1s önce' },
    { id: '2', title: 'Sağ kenar tutuşu hakkında soru', unread: false, author: 'ayse_kaya', replies: 2, ago: '2g önce' },
    { id: '3', title: 'Fırça önerisi?', unread: true, author: 'fatih_climb', replies: 8, ago: '4g önce' },
  ]
  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <Link href="/" className="inline-flex items-center gap-1.5 text-[11px] text-[#8a8a8a] hover:text-white transition-colors mb-4">
        <ArrowLeft size={12} />
        Ana Sayfa
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#8a8a8a] mb-0.5">Sektör</p>
          <h1 className="text-lg font-bold text-white uppercase tracking-wider">Ana Duvar</h1>
        </div>
        <Link href="/topics/new" className="text-xs uppercase tracking-widest bg-[#8b1a1a] hover:bg-[#a82020] text-white px-4 py-2 transition-colors">
          + Yeni Konu
        </Link>
      </div>
      <div className="divide-y divide-[#2a2a2a]">
        {items.map((t) => (
          <div key={t.id} className="flex items-start gap-4 py-4 hover:bg-[#161616] -mx-4 px-4 transition-colors cursor-pointer">
            <div className="mt-2 shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${t.unread ? 'bg-[#c0392b]' : 'bg-transparent'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm leading-snug truncate ${t.unread ? 'font-semibold text-white' : 'text-[#c8c8c8]'}`}>{t.title}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#8a8a8a]">
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
