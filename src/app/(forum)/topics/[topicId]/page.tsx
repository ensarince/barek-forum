import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from '@/lib/utils'
import PostsList from '@/components/forum/PostsList'
import PollWidget from '@/components/forum/PollWidget'
import OpeningPost from '@/components/forum/OpeningPost'
import { ArrowLeft, User } from 'lucide-react'
import type { TopicWithMeta, PostWithAuthor, Profile, Image as ImageRow, Poll, PollVote, ReactionGroup } from '@/types/database'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

interface PageProps {
  params: Promise<{ topicId: string }>
}

type RawReaction = {
  emoji: string
  user_id: string
  post_id?: string | null
  profile: { username: string } | { username: string }[] | null
}

function getUsername(profile: RawReaction['profile']): string | null {
  if (!profile) return null
  if (Array.isArray(profile)) return profile[0]?.username ?? null
  return profile.username ?? null
}

function groupReactions(raw: RawReaction[], currentUserId: string): ReactionGroup[] {
  const map = new Map<string, ReactionGroup>()
  for (const r of raw) {
    const g = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, usernames: [], userReacted: false }
    g.count++
    const uname = getUsername(r.profile)
    if (uname) g.usernames.push(uname)
    if (r.user_id === currentUserId) g.userReacted = true
    map.set(r.emoji, g)
  }
  return Array.from(map.values())
}

export default async function TopicPage({ params }: PageProps) {
  const { topicId } = await params

  if (!SUPABASE_CONFIGURED) {
    return <PreviewTopic topicId={topicId} />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if admin so they can preview pending/rejected topics
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()
  const isAdmin = (callerProfile as { role: string } | null)?.role === 'admin'

  let topicQuery = supabase
    .from('topics')
    .select(`*, author:profiles!topics_author_id_fkey(username, avatar_url), sector:sectors(name)`)
    .eq('id', topicId)

  if (!isAdmin) topicQuery = topicQuery.eq('status', 'approved')

  const { data: topicData } = await topicQuery.single()

  if (!topicData) notFound()

  const topic = topicData as TopicWithMeta

  const { data: postsData } = await supabase
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(username, avatar_url)')
    .eq('topic_id', topicId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })

  const posts = (postsData ?? []) as PostWithAuthor[]

  // Fetch images for the opening post (topic-level, post_id IS NULL)
  const { data: topicImagesData } = await supabase
    .from('images')
    .select('*')
    .eq('topic_id', topicId)
    .is('post_id', null)
  const topicImages = (topicImagesData ?? []) as ImageRow[]

  // Fetch images for all posts
  const postIds = posts.map((p) => p.id)
  const initialImages: Record<string, ImageRow[]> = {}
  if (postIds.length > 0) {
    const { data: imagesData } = await supabase
      .from('images')
      .select('*')
      .in('post_id', postIds)
    const imgs = (imagesData ?? []) as ImageRow[]
    for (const img of imgs) {
      if (img.post_id) {
        initialImages[img.post_id] = [...(initialImages[img.post_id] ?? []), img]
      }
    }
  }

  // Fetch current user profile for reply form
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .eq('id', user!.id)
    .single()

  const profile = profileData as Pick<Profile, 'id' | 'username' | 'avatar_url'> | null

  // Fetch topic-level poll + votes
  const { data: pollData } = await supabase
    .from('polls')
    .select('*')
    .eq('topic_id', topicId)
    .maybeSingle()

  const poll = pollData as Poll | null
  const pollVotes: Record<string, number> = {}
  let userVote: string | null = null

  if (poll) {
    const { data: votesData } = await supabase
      .from('poll_votes')
      .select('grade, user_id')
      .eq('poll_id', poll.id)

    const votes = (votesData ?? []) as Pick<PollVote, 'grade' | 'user_id'>[]
    for (const v of votes) {
      pollVotes[v.grade] = (pollVotes[v.grade] ?? 0) + 1
      if (v.user_id === user!.id) userVote = v.grade
    }
  }

  // Fetch post-level polls + votes
  interface PostPollData {
    poll: Poll
    votes: Record<string, number>
    userVote: string | null
  }
  const initialPostPolls: Record<string, PostPollData> = {}
  if (postIds.length > 0) {
    const { data: postPollsData } = await supabase
      .from('polls')
      .select('*')
      .in('post_id', postIds)

    const postPollsList = (postPollsData ?? []) as Poll[]

    if (postPollsList.length > 0) {
      const pollIds = postPollsList.map((p) => p.id)
      const { data: postPollVotesData } = await supabase
        .from('poll_votes')
        .select('grade, user_id, poll_id')
        .in('poll_id', pollIds)

      const postPollVotes = (postPollVotesData ?? []) as (Pick<PollVote, 'grade' | 'user_id'> & { poll_id: string })[]

      for (const p of postPollsList) {
        if (!p.post_id) continue
        const pvotes = postPollVotes.filter((v) => v.poll_id === p.id)
        const voteCounts: Record<string, number> = {}
        let uv: string | null = null
        for (const v of pvotes) {
          voteCounts[v.grade] = (voteCounts[v.grade] ?? 0) + 1
          if (v.user_id === user!.id) uv = v.grade
        }
        initialPostPolls[p.post_id] = { poll: p, votes: voteCounts, userVote: uv }
      }
    }
  }

  // Fetch topic reactions
  const { data: topicReactionsRaw } = await supabase
    .from('reactions')
    .select('emoji, user_id, profile:profiles(username)')
    .eq('topic_id', topicId)
    .is('post_id', null)
  const topicReactions = groupReactions((topicReactionsRaw ?? []) as unknown as RawReaction[], user!.id)

  // Fetch post reactions
  const initialPostReactions: Record<string, ReactionGroup[]> = {}
  if (postIds.length > 0) {
    const { data: postReactionsRaw } = await supabase
      .from('reactions')
      .select('emoji, user_id, post_id, profile:profiles(username)')
      .in('post_id', postIds)
      .is('topic_id', null)
    const rawList = (postReactionsRaw ?? []) as unknown as RawReaction[]
    const byPost = new Map<string, RawReaction[]>()
    for (const r of rawList) {
      if (!r.post_id) continue
      const arr = byPost.get(r.post_id) ?? []
      arr.push(r)
      byPost.set(r.post_id, arr)
    }
    for (const [pid, arr] of byPost.entries()) {
      initialPostReactions[pid] = groupReactions(arr, user!.id)
    }
  }

  // Mark as read
  await supabase
    .from('topic_reads')
    .upsert({ user_id: user!.id, topic_id: topicId, last_read_at: new Date().toISOString() })

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6 px-4">
      <TopicHeader topic={topic} />
      <OpeningPost
        topic={topic}
        images={topicImages}
        currentUserId={user!.id}
        currentUsername={profile?.username ?? 'bilinmiyor'}
        initialReactions={topicReactions}
      />
      {poll && (
        <PollWidget
          pollId={poll.id}
          question={poll.question}
          initialVotes={pollVotes}
          initialUserVote={userVote}
        />
      )}
      <PostsList
        topicId={topicId}
        initialPosts={posts}
        initialImages={initialImages}
        initialPostPolls={initialPostPolls}
        initialPostReactions={initialPostReactions}
        currentUserId={user!.id}
        currentUsername={profile?.username ?? 'bilinmiyor'}
        currentAvatarUrl={profile?.avatar_url ?? null}
      />
    </div>
  )
}

function TopicHeader({ topic }: { topic: TopicWithMeta }) {
  const backHref = topic.sector_id ? `/sectors/${topic.sector_id}` : '/'
  return (
    <div className="mb-4 sm:mb-6">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-[11px] text-[#6b6b6b] hover:text-white transition-colors mb-3">
        <ArrowLeft size={12} />
        {topic.sector ? topic.sector.name : 'Ana Sayfa'}
      </Link>
      <div className="flex items-center gap-2 mb-2">
        {topic.type === 'announcement' && (
          <span className="text-[9px] uppercase tracking-widest bg-[#8b1a1a] text-white px-1.5 py-0.5">Duyuru</span>
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
      <h1 className="text-xl font-bold text-white leading-snug">{topic.title}</h1>
      <p className="text-[11px] text-[#6b6b6b] mt-1">
        {topic.author?.username ?? 'bilinmiyor'} · {formatDistanceToNow(topic.created_at)}
      </p>
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
