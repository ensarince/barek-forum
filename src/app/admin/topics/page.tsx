import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/admin/StatusBadge'
import AdminAction from '@/components/admin/AdminAction'
import { formatDistanceToNow } from '@/lib/utils'
import type { TopicWithMeta } from '@/types/database'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

const PREVIEW_TOPICS: TopicWithMeta[] = [
  { id: 't1', title: 'Ana Duvar yeni güzergah önerisi', content: '', author_id: 'u1', sector_id: '1', tag: null, type: 'discussion', status: 'pending', is_pinned: false, approved_by: null, approved_at: null, created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString(), author: { username: 'taş_tırmanan', avatar_url: null }, sector: { name: 'Ana Duvar' } },
  { id: 't2', title: 'Mağara Sektörü beta sorusu', content: '', author_id: 'u2', sector_id: '2', tag: null, type: 'discussion', status: 'pending', is_pinned: false, approved_by: null, approved_at: null, created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: new Date(Date.now() - 7200000).toISOString(), author: { username: 'kaya_kemal', avatar_url: null }, sector: { name: 'Mağara Sektörü' } },
  { id: 't3', title: 'Sezon açılışı hakkında', content: '', author_id: 'u4', sector_id: null, tag: null, type: 'announcement', status: 'approved', is_pinned: true, approved_by: 'admin', approved_at: new Date(Date.now() - 86400000).toISOString(), created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString(), author: { username: 'murat_b', avatar_url: null }, sector: null },
  { id: 't4', title: 'Bouldering matı tavsiyesi', content: '', author_id: 'u5', sector_id: '1', tag: null, type: 'discussion', status: 'approved', is_pinned: false, approved_by: 'admin', approved_at: new Date(Date.now() - 172800000).toISOString(), created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: new Date(Date.now() - 172800000).toISOString(), author: { username: 'fatih_climb', avatar_url: null }, sector: { name: 'Ana Duvar' } },
  { id: 't5', title: 'Sol Kanat taş temizliği', content: '', author_id: 'u6', sector_id: '3', tag: null, type: 'discussion', status: 'approved', is_pinned: false, approved_by: 'admin', approved_at: new Date(Date.now() - 259200000).toISOString(), created_at: new Date(Date.now() - 259200000).toISOString(), updated_at: new Date(Date.now() - 259200000).toISOString(), author: { username: 'ayse_kaya', avatar_url: null }, sector: { name: 'Sol Kanat' } },
]

function TopicRow({ topic }: { topic: TopicWithMeta }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-[#161616] transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{topic.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[#6b6b6b]">{topic.author?.username}</span>
          {topic.sector && (
            <span className="text-[10px] text-[#6b6b6b] border border-[#2a2a2a] px-1">{topic.sector.name}</span>
          )}
        </div>
      </div>
      <p className="text-xs text-[#6b6b6b] hidden sm:block shrink-0">{formatDistanceToNow(topic.created_at)}</p>
      <StatusBadge status={topic.status} />
      <Link href={`/topics/${topic.id}`} className="text-xs text-[#6b6b6b] hover:text-white transition-colors shrink-0">
        Gör →
      </Link>
      <AdminAction type="topic" id={topic.id} currentStatus={topic.status} />
    </div>
  )
}

function Section({ title, topics }: { title: string; topics: TopicWithMeta[] }) {
  if (topics.length === 0) return null
  return (
    <div className="mb-8">
      <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-3 px-4">{title} ({topics.length})</h2>
      <div className="border border-[#2a2a2a] divide-y divide-[#2a2a2a]">
        {topics.map((t) => <TopicRow key={t.id} topic={t} />)}
      </div>
    </div>
  )
}

export default async function AdminTopicsPage() {
  let topics: TopicWithMeta[] = PREVIEW_TOPICS

  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('topics')
      .select('*, author:profiles!topics_author_id_fkey(username, avatar_url), sector:sectors(name)')
      .order('created_at', { ascending: false })
    topics = (data ?? []) as TopicWithMeta[]
  }

  const pending = topics.filter((t) => t.status === 'pending')
  const approved = topics.filter((t) => t.status === 'approved')
  const rejected = topics.filter((t) => t.status === 'rejected')

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xs uppercase tracking-[0.25em] text-[#6b6b6b] mb-6">Konular</h1>
      <Section title="Onay Bekleyenler" topics={pending} />
      <Section title="Onaylananlar" topics={approved} />
      <Section title="Reddedilenler" topics={rejected} />
    </div>
  )
}
