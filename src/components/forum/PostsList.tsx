'use client'

import { useEffect, useState } from 'react'
import { User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from '@/lib/utils'
import ReplyForm from './ReplyForm'
import PostImages from './PostImages'
import PollWidget from './PollWidget'
import { renderContent } from '@/lib/renderContent'
import type { PostWithAuthor, Image as ImageRow, Poll } from '@/types/database'

interface PostPollData {
  poll: Poll
  votes: Record<string, number>
  userVote: string | null
}

interface PostsListProps {
  topicId: string
  initialPosts: PostWithAuthor[]
  initialImages?: Record<string, ImageRow[]>
  initialPostPolls?: Record<string, PostPollData>
  currentUserId: string
  currentUsername: string
  currentAvatarUrl: string | null
}

export default function PostsList({
  topicId,
  initialPosts,
  initialImages = {},
  initialPostPolls = {},
  currentUserId,
  currentUsername,
  currentAvatarUrl,
}: PostsListProps) {
  const [posts, setPosts] = useState<PostWithAuthor[]>(initialPosts)
  const [images, setImages] = useState<Record<string, ImageRow[]>>(initialImages)
  const [postPolls, setPostPolls] = useState<Record<string, PostPollData>>(initialPostPolls)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  function addPost(newPost: PostWithAuthor, newImages: ImageRow[] = [], poll?: Poll | null) {
    setPosts((prev) => {
      if (prev.some((p) => p.id === newPost.id)) return prev
      return [...prev, newPost]
    })
    if (newImages.length > 0) {
      setImages((prev) => ({ ...prev, [newPost.id]: newImages }))
    }
    if (poll) {
      setPostPolls((prev) => ({
        ...prev,
        [newPost.id]: { poll, votes: {}, userVote: null },
      }))
    }
  }

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`topic-posts-${topicId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `topic_id=eq.${topicId}` },
        async (payload) => {
          const newId = (payload.new as { id: string }).id

          setPosts((current) => {
            if (current.some((p) => p.id === newId)) return current
            return current
          })

          const { data } = await supabase
            .from('posts')
            .select('*, author:profiles!posts_author_id_fkey(username, avatar_url)')
            .eq('id', newId)
            .single()

          if (data) {
            setPosts((current) => {
              if (current.some((p) => p.id === newId)) return current
              return [...current, data as PostWithAuthor]
            })

            // Check if this post has a poll (created by another user via Realtime)
            const { data: pollData } = await supabase
              .from('polls')
              .select('*')
              .eq('post_id', newId)
              .maybeSingle()
            if (pollData) {
              setPostPolls((current) => ({
                ...current,
                [newId]: { poll: pollData as Poll, votes: {}, userVote: null },
              }))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [topicId])

  const topLevel = posts.filter((p) => !p.parent_post_id)

  function getReplies(postId: string) {
    return posts.filter((p) => p.parent_post_id === postId)
  }

  return (
    <>
      {topLevel.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b]">{posts.length} Yanıt</span>
            <div className="flex-1 border-t border-[#2a2a2a]" />
          </div>

          <div className="space-y-2">
            {topLevel.map((post) => {
              const replies = getReplies(post.id)
              return (
                <div key={post.id}>
                  <PostCard
                    post={post}
                    postImages={images[post.id] ?? []}
                    postPoll={postPolls[post.id]}
                    onReply={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                    isReplying={replyingTo === post.id}
                  />

                  {replyingTo === post.id && (
                    <div className="ml-6 sm:ml-9 mt-1 mb-2">
                      <ReplyForm
                        topicId={topicId}
                        parentPostId={post.id}
                        authorId={currentUserId}
                        authorUsername={currentUsername}
                        authorAvatarUrl={currentAvatarUrl}
                        onSuccess={(p, imgs, poll) => { addPost(p, imgs, poll); setReplyingTo(null) }}
                        onCancel={() => setReplyingTo(null)}
                        compact
                      />
                    </div>
                  )}

                  {replies.length > 0 && (
                    <div className="ml-6 sm:ml-9 border-l-2 border-[#2a2a2a] pl-3 sm:pl-4 mt-1 space-y-1">
                      {replies.map((reply) => (
                        <div key={reply.id}>
                          <PostCard
                            post={reply}
                            postImages={images[reply.id] ?? []}
                            postPoll={postPolls[reply.id]}
                            onReply={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                            isReplying={replyingTo === reply.id}
                            nested
                          />
                          {replyingTo === reply.id && (
                            <div className="mt-1 mb-2">
                              <ReplyForm
                                topicId={topicId}
                                parentPostId={post.id}
                                authorId={currentUserId}
                                authorUsername={currentUsername}
                                authorAvatarUrl={currentAvatarUrl}
                                onSuccess={(p, imgs, poll) => { addPost(p, imgs, poll); setReplyingTo(null) }}
                                onCancel={() => setReplyingTo(null)}
                                compact
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Top-level reply form */}
      <ReplyForm
        topicId={topicId}
        parentPostId={null}
        authorId={currentUserId}
        authorUsername={currentUsername}
        authorAvatarUrl={currentAvatarUrl}
        onSuccess={addPost}
      />
    </>
  )
}

function PostCard({
  post,
  postImages,
  postPoll,
  onReply,
  isReplying,
  nested = false,
}: {
  post: PostWithAuthor
  postImages: ImageRow[]
  postPoll?: PostPollData
  onReply: () => void
  isReplying: boolean
  nested?: boolean
}) {
  return (
    <div className={`bg-[#161616] border border-[#2a2a2a] ${nested ? 'p-3' : 'p-3 sm:p-5'}`}>
      <div className="flex items-center gap-2">
        {post.author?.avatar_url ? (
          <img src={post.author.avatar_url} alt="" className="w-6 h-6 object-cover border border-[#2a2a2a] shrink-0" />
        ) : (
          <div className="w-6 h-6 bg-[#2a2a2a] flex items-center justify-center shrink-0">
            <User size={12} className="text-[#6b6b6b]" />
          </div>
        )}
        <span className="text-sm font-medium text-[#e8e8e8]">{post.author?.username ?? 'bilinmiyor'}</span>
        <span className="text-[11px] text-[#6b6b6b]">· {formatDistanceToNow(post.created_at)}</span>
      </div>

      <div className="mt-2 text-sm text-[#c8c8c8] leading-relaxed whitespace-pre-wrap ml-7 sm:ml-8">
        {renderContent(post.content)}
      </div>

      <PostImages images={postImages} />

      {postPoll && (
        <div className="mt-3 ml-7 sm:ml-8">
          <PollWidget
            pollId={postPoll.poll.id}
            question={postPoll.poll.question}
            initialVotes={postPoll.votes}
            initialUserVote={postPoll.userVote}
          />
        </div>
      )}

      <div className="ml-7 sm:ml-8 mt-2">
        <button
          onClick={onReply}
          className={`text-xs transition-colors ${isReplying ? 'text-[#c0392b]' : 'text-[#6b6b6b] hover:text-white'}`}
        >
          {isReplying ? '↩ İptal' : '↩ Yanıtla'}
        </button>
      </div>
    </div>
  )
}
