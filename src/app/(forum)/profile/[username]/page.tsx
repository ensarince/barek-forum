import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatMonthYear, formatDistanceToNow } from '@/lib/utils'
import type { Profile, Topic, Post } from '@/types/database'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

interface PageProps {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params

  if (!SUPABASE_CONFIGURED) {
    return <PreviewProfile username={username} />
  }

  const supabase = await createClient()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  const profile = profileData as Profile | null

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#6b6b6b] text-sm">Kullanıcı bulunamadı.</p>
      </div>
    )
  }

  const { data: topicsData } = await supabase
    .from('topics')
    .select('id, title, created_at, updated_at')
    .eq('author_id', profile.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: postsData } = await supabase
    .from('posts')
    .select('id, topic_id, content, created_at')
    .eq('author_id', profile.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(5)

  const topics = (topicsData ?? []) as Pick<Topic, 'id' | 'title' | 'created_at' | 'updated_at'>[]
  const posts = (postsData ?? []) as Pick<Post, 'id' | 'topic_id' | 'content' | 'created_at'>[]

  return <ProfileView profile={profile} topics={topics} posts={posts} />
}

type TopicSnippet = Pick<Topic, 'id' | 'title' | 'created_at' | 'updated_at'>
type PostSnippet = Pick<Post, 'id' | 'topic_id' | 'content' | 'created_at'>

function ProfileView({
  profile,
  topics,
  posts,
}: {
  profile: Profile
  topics: TopicSnippet[]
  posts: PostSnippet[]
}) {
  const links = [
    { label: '8a.nu', href: profile.eight_a_url },
    { label: '27crags', href: profile.topo_url },
    { label: 'Instagram', href: profile.instagram_url },
    { label: 'YouTube', href: profile.youtube_url },
  ].filter((l) => !!l.href)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left column */}
        <div className="md:w-1/3 shrink-0">
          <div className="bg-[#161616] border border-[#2a2a2a] p-6">
            {/* Avatar */}
            <div className="mb-4">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-20 h-20 object-cover border border-[#2a2a2a]"
                />
              ) : (
                <div className="w-20 h-20 bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center">
                  <span className="text-3xl font-bold text-[#2a2a2a] uppercase">
                    {profile.username[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-white uppercase tracking-wider">
                  {profile.username}
                </h1>
                {profile.role === 'admin' && (
                  <span className="text-[9px] uppercase tracking-widest bg-[#8b1a1a] text-white px-1.5 py-0.5">
                    ADMİN
                  </span>
                )}
              </div>
              {profile.full_name && (
                <p className="text-[#6b6b6b] text-sm mt-0.5">{profile.full_name}</p>
              )}
              <p className="text-[#6b6b6b] text-xs mt-2">
                Üye: {formatMonthYear(profile.created_at)}
              </p>
            </div>

            {/* External links */}
            {links.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#6b6b6b] hover:text-white text-xs border border-[#2a2a2a] px-3 py-1.5 hover:border-[#8b1a1a] transition-colors"
                  >
                    <ExternalLink size={11} />
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex-1 space-y-8">
          {/* Recent topics */}
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-3">
              Son Konular
            </h2>
            {topics.length > 0 ? (
              <div className="divide-y divide-[#2a2a2a] border border-[#2a2a2a]">
                {topics.map((t) => (
                  <Link
                    key={t.id}
                    href={`/topics/${t.id}`}
                    className="block px-4 py-3 hover:bg-[#161616] transition-colors"
                  >
                    <p className="text-sm text-[#e8e8e8] hover:text-white truncate">{t.title}</p>
                    <p className="text-[11px] text-[#6b6b6b] mt-0.5">{formatDistanceToNow(t.created_at)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[#6b6b6b] text-sm">Henüz konu yok.</p>
            )}
          </div>

          {/* Recent replies */}
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-3">
              Son Yanıtlar
            </h2>
            {posts.length > 0 ? (
              <div className="divide-y divide-[#2a2a2a] border border-[#2a2a2a]">
                {posts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/topics/${p.topic_id}`}
                    className="block px-4 py-3 hover:bg-[#161616] transition-colors"
                  >
                    <p className="text-sm text-[#a0a0a0] line-clamp-2 leading-relaxed">
                      {p.content.slice(0, 120)}{p.content.length > 120 ? '…' : ''}
                    </p>
                    <p className="text-[11px] text-[#6b6b6b] mt-0.5">{formatDistanceToNow(p.created_at)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[#6b6b6b] text-sm">Henüz yanıt yok.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewProfile({ username }: { username: string }) {
  const profile: Profile = {
    id: 'preview',
    username: username === 'preview_user' ? 'kemal_tas' : username,
    full_name: 'Kemal Taş',
    avatar_url: null,
    status: 'approved',
    role: 'user',
    eight_a_url: 'https://www.8a.nu/user/kemal_tas',
    topo_url: 'https://27crags.com/climbers/kemal_tas',
    instagram_url: 'https://instagram.com/kemal_boulder',
    youtube_url: null,
    created_at: '2023-04-15T00:00:00Z',
  }
  const topics: TopicSnippet[] = [
    { id: '1', title: 'Ana Duvar yeni güzergah beta', created_at: '2024-03-01T10:00:00Z', updated_at: '2024-03-01T10:00:00Z' },
    { id: '2', title: 'Mağara altı projeksiyon hakkında', created_at: '2024-02-15T10:00:00Z', updated_at: '2024-02-15T10:00:00Z' },
    { id: '3', title: 'Bouldering matı tavsiyesi', created_at: '2024-01-20T10:00:00Z', updated_at: '2024-01-20T10:00:00Z' },
  ]
  const posts: PostSnippet[] = [
    { id: 'p1', topic_id: '4', content: 'Ben de geçen hafta baktım, taşın altındaki tutuş biraz kırılmış gibi duruyor ama hâlâ kullanılabilir.', created_at: '2024-03-10T10:00:00Z' },
    { id: 'p2', topic_id: '5', content: 'Sol kanat temizliği harika olmuş, teşekkürler. Pazar günü gidip denedim.', created_at: '2024-03-05T10:00:00Z' },
    { id: 'p3', topic_id: '2', content: '6B+ güzergahı için ayak pozisyonu çok kritik, sağ ayağı biraz daha yukarı çekince patlama oluyor.', created_at: '2024-02-28T10:00:00Z' },
  ]
  return <ProfileView profile={profile} topics={topics} posts={posts} />
}
