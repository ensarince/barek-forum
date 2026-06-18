import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from '@/lib/utils'
import PostsList from '@/components/forum/PostsList'
import { User } from 'lucide-react'
import type { TopicWithMeta, PostWithAuthor, Profile } from '@/types/database'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

interface PageProps {
  params: Promise<{ topicId: string }>
}

export default async function TopicPage({ params }: PageProps) {
  const { topicId } = await params

  if (!SUPABASE_CONFIGURED) {
    return <PreviewTopic topicId={topicId} />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: topicData } = await supabase
    .from('topics')
    .select(`
      *,
      author:profiles!topics_author_id_fkey(username, avatar_url),
      sector:sectors(name)
    `)
    .eq('id', topicId)
    .eq('status', 'approved')
    .single()

  if (!topicData) notFound()

  const topic = topicData as TopicWithMeta

  const { data: postsData } = await supabase
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(username, avatar_url)')
    .eq('topic_id', topicId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })

  const posts = (postsData ?? []) as PostWithAuthor[]

  // Fetch current user profile for reply form
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .eq('id', user!.id)
    .single()

  const profile = profileData as Pick<Profile, 'id' | 'username' | 'avatar_url'> | null

  // Mark as read
  await supabase
    .from('topic_reads')
    .upsert({ user_id: user!.id, topic_id: topicId, last_read_at: new Date().toISOString() })

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <TopicHeader topic={topic} />
      <OpeningPost topic={topic} />
      <PostsList
        topicId={topicId}
        initialPosts={posts}
        currentUserId={user!.id}
        currentUsername={profile?.username ?? 'bilinmiyor'}
        currentAvatarUrl={profile?.avatar_url ?? null}
      />
    </div>
  )
}

function TopicHeader({ topic }: { topic: TopicWithMeta }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        {topic.type === 'announcement' && (
          <span className="text-[9px] uppercase tracking-widest bg-[#8b1a1a] text-white px-1.5 py-0.5">Duyuru</span>
        )}
        {topic.sector && (
          <span className="text-[10px] uppercase tracking-wider text-[#6b6b6b] border border-[#2a2a2a] px-1.5 py-0.5">
            {topic.sector.name}
          </span>
        )}
      </div>
      <h1 className="text-xl font-bold text-white leading-snug">{topic.title}</h1>
      <p className="text-[11px] text-[#6b6b6b] mt-1">
        {topic.author?.username ?? 'bilinmiyor'} · {formatDistanceToNow(topic.created_at)}
      </p>
    </div>
  )
}

function OpeningPost({ topic }: { topic: TopicWithMeta }) {
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] p-5 mb-6">
      <div className="flex items-center gap-2.5">
        {topic.author?.avatar_url ? (
          <img src={topic.author.avatar_url} alt="" className="w-7 h-7 object-cover border border-[#2a2a2a]" />
        ) : (
          <div className="w-7 h-7 bg-[#2a2a2a] flex items-center justify-center shrink-0">
            <User size={14} className="text-[#6b6b6b]" />
          </div>
        )}
        <span className="text-sm font-medium text-[#e8e8e8]">{topic.author?.username ?? 'bilinmiyor'}</span>
        <span className="text-[11px] text-[#6b6b6b]">· {formatDistanceToNow(topic.created_at)}</span>
      </div>
      <div className="mt-3 text-sm text-[#e8e8e8] leading-relaxed whitespace-pre-wrap">{topic.content}</div>
    </div>
  )
}

const PREVIEW_POSTS: PostWithAuthor[] = [
  { id: '1', topic_id: 'preview', author_id: 'a1', content: 'Ben de aynı rotayı denedim, başlangıç tutuşu gerçekten zor. Sağ el için daha iyi pozisyon buldum.', parent_post_id: null, is_deleted: false, created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString(), author: { username: 'ayse_kaya', avatar_url: null } },
  { id: '2', topic_id: 'preview', author_id: 'a2', content: 'Hangi tutuştan bahsediyorsun? İlk mi ikinci mi?', parent_post_id: '1', is_deleted: false, created_at: new Date(Date.now() - 1800000).toISOString(), updated_at: new Date().toISOString(), author: { username: 'murat_b', avatar_url: null } },
  { id: '3', topic_id: 'preview', author_id: 'a3', content: 'Beta: başlangıçta sol ayağı biraz daha yükseğe çek, sonra sağ el palme ile rahat tutuluyor.', parent_post_id: null, is_deleted: false, created_at: new Date(Date.now() - 900000).toISOString(), updated_at: new Date().toISOString(), author: { username: 'fatih_climb', avatar_url: null } },
]

function PreviewTopic({ topicId }: { topicId: string }) {
  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-wider text-[#6b6b6b] border border-[#2a2a2a] px-1.5 py-0.5">Ana Duvar</span>
        </div>
        <h1 className="text-xl font-bold text-white leading-snug">Ana Duvar — yeni güzergahlar hakkında</h1>
        <p className="text-[11px] text-[#6b6b6b] mt-1">kemal_tas · 2s önce</p>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] p-5 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#2a2a2a] flex items-center justify-center shrink-0">
            <User size={14} className="text-[#6b6b6b]" />
          </div>
          <span className="text-sm font-medium text-[#e8e8e8]">kemal_tas</span>
          <span className="text-[11px] text-[#6b6b6b]">· 2s önce</span>
        </div>
        <div className="mt-3 text-sm text-[#e8e8e8] leading-relaxed whitespace-pre-wrap">
          {'Merhaba, Ana Duvar\'da birkaç yeni güzergah keşfettim.\n\nBaşlangıç tutuşu biraz garip ama bir kez adam ettikten sonra çok akıcı gidiyor. Bilen var mı?'}
        </div>
      </div>

      <PostsList
        topicId={topicId}
        initialPosts={PREVIEW_POSTS}
        currentUserId="preview-user"
        currentUsername="sen"
        currentAvatarUrl={null}
      />
    </div>
  )
}
