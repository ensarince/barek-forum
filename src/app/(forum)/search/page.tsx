import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from '@/lib/utils'
import type { Topic, Post, Profile, Sector } from '@/types/database'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

type TopicResult = Pick<Topic, 'id' | 'title' | 'content' | 'created_at'> & {
  author: Pick<Profile, 'username'> | null
  sector: Pick<Sector, 'name'> | null
}

type PostResult = Pick<Post, 'id' | 'topic_id' | 'content' | 'created_at'> & {
  author: Pick<Profile, 'username'> | null
  topic: Pick<Topic, 'title'> | null
}

type SectorResult = Pick<Sector, 'id' | 'name' | 'description'>

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  if (!query) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <p className="text-[#6b6b6b] text-sm">Aramak için bir kelime gir.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const pattern = `%${query}%`

  const [{ data: topicsData }, { data: postsData }, { data: sectorsData }] = await Promise.all([
    supabase
      .from('topics')
      .select('id, title, content, created_at, author:profiles!topics_author_id_fkey(username), sector:sectors(name)')
      .eq('status', 'approved')
      .or(`title.ilike.${pattern},content.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('posts')
      .select('id, topic_id, content, created_at, author:profiles!posts_author_id_fkey(username), topic:topics!posts_topic_id_fkey(title, status)')
      .eq('is_deleted', false)
      .ilike('content', pattern)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('sectors')
      .select('id, name, description')
      .ilike('name', pattern)
      .limit(10),
  ])

  const topics = (topicsData ?? []) as unknown as TopicResult[]
  const allPosts = (postsData ?? []) as unknown as (PostResult & { topic: (Pick<Topic, 'title'> & { status: string }) | null })[]
  const sectors = (sectorsData ?? []) as SectorResult[]
  const posts = allPosts.filter((p) => p.topic?.status === 'approved')

  const total = sectors.length + topics.length + posts.length

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b]">
          &ldquo;{query}&rdquo; için {total} sonuç
        </h1>
        <div className="flex-1 border-t border-[#2a2a2a]" />
      </div>

      {total === 0 && (
        <p className="text-[#6b6b6b] text-sm">Hiç sonuç bulunamadı.</p>
      )}

      {sectors.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-[#6b6b6b] mb-3">
            Sektörler ({sectors.length})
          </h2>
          <div className="border border-[#2a2a2a] divide-y divide-[#2a2a2a]">
            {sectors.map((s) => (
              <Link
                key={s.id}
                href={`/sectors/${s.id}`}
                className="block px-4 py-3 hover:bg-[#161616] transition-colors"
              >
                <p className="text-sm text-[#e8e8e8] font-medium">
                  <Highlight text={s.name} query={query} />
                </p>
                {s.description && (
                  <p className="text-xs text-[#6b6b6b] mt-0.5">{s.description}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {topics.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-[#6b6b6b] mb-3">
            Konular ({topics.length})
          </h2>
          <div className="border border-[#2a2a2a] divide-y divide-[#2a2a2a]">
            {topics.map((t) => (
              <Link
                key={t.id}
                href={`/topics/${t.id}`}
                className="block px-4 py-3 hover:bg-[#161616] transition-colors"
              >
                <p className="text-sm text-[#e8e8e8] font-medium leading-snug">
                  <Highlight text={t.title} query={query} />
                </p>
                <p className="text-xs text-[#6b6b6b] mt-1 line-clamp-2 leading-relaxed">
                  <Highlight text={t.content} query={query} />
                </p>
                <p className="text-[11px] text-[#4a4a4a] mt-1">
                  {t.author?.username ?? 'bilinmiyor'} · {formatDistanceToNow(t.created_at)}
                  {t.sector && <span className="ml-2 text-[#6b6b6b]">· {t.sector.name}</span>}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section>
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-[#6b6b6b] mb-3">
            Yanıtlar ({posts.length})
          </h2>
          <div className="border border-[#2a2a2a] divide-y divide-[#2a2a2a]">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/topics/${p.topic_id}`}
                className="block px-4 py-3 hover:bg-[#161616] transition-colors"
              >
                <p className="text-[10px] uppercase tracking-wider text-[#8b1a1a] mb-1 truncate">
                  {p.topic?.title ?? ''}
                </p>
                <p className="text-sm text-[#a0a0a0] line-clamp-2 leading-relaxed">
                  <Highlight text={p.content} query={query} />
                </p>
                <p className="text-[11px] text-[#4a4a4a] mt-1">
                  {p.author?.username ?? 'bilinmiyor'} · {formatDistanceToNow(p.created_at)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Highlight({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text.slice(0, 160)}{text.length > 160 ? '…' : ''}</>

  const start = Math.max(0, idx - 40)
  const end = Math.min(text.length, idx + query.length + 100)
  const before = text.slice(start, idx)
  const match = text.slice(idx, idx + query.length)
  const after = text.slice(idx + query.length, end)

  return (
    <>
      {start > 0 && '…'}{before}
      <mark className="bg-[#8b1a1a] text-white">{match}</mark>
      {after}{end < text.length && '…'}
    </>
  )
}
