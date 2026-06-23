'use client'

import { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, User, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from '@/lib/utils'
import ReplyForm from './ReplyForm'
import PostImages from './PostImages'
import PollWidget from './PollWidget'
import { renderContent } from '@/lib/renderContent'
import ReactionBar from './ReactionBar'
import type { PostWithAuthor, Image as ImageRow, Poll, ReactionGroup } from '@/types/database'

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
  initialPostReactions?: Record<string, ReactionGroup[]>
  currentUserId: string
  currentUsername: string
  currentAvatarUrl: string | null
}

export default function PostsList({
  topicId,
  initialPosts,
  initialImages = {},
  initialPostPolls = {},
  initialPostReactions = {},
  currentUserId,
  currentUsername,
  currentAvatarUrl,
}: PostsListProps) {
  const [posts, setPosts] = useState<PostWithAuthor[]>(initialPosts)
  const [images, setImages] = useState<Record<string, ImageRow[]>>(initialImages)
  const [postPolls, setPostPolls] = useState<Record<string, PostPollData>>(initialPostPolls)
  const [postReactions] = useState<Record<string, ReactionGroup[]>>(initialPostReactions)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const router = useRouter()

  function updatePostContent(postId: string, newContent: string) {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, content: newContent } : p))
  }

  function removePost(postId: string) {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, is_deleted: true, content: '' } : p))
  }

  function handleTopicDeleted() {
    router.push('/')
  }

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
                    postReactions={postReactions[post.id] ?? []}
                    currentUserId={currentUserId}
                    currentUsername={currentUsername}
                    onReply={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                    isReplying={replyingTo === post.id}
                    onEdit={updatePostContent}
                    onDelete={removePost}
                    onTopicDeleted={handleTopicDeleted}
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
                            postReactions={postReactions[reply.id] ?? []}
                            currentUserId={currentUserId}
                            currentUsername={currentUsername}
                            onReply={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                            isReplying={replyingTo === reply.id}
                            onEdit={updatePostContent}
                            onDelete={removePost}
                            onTopicDeleted={handleTopicDeleted}
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
  postReactions,
  currentUserId,
  currentUsername,
  onReply,
  isReplying,
  onEdit,
  onDelete,
  onTopicDeleted,
  nested = false,
}: {
  post: PostWithAuthor
  postImages: ImageRow[]
  postPoll?: PostPollData
  postReactions: ReactionGroup[]
  currentUserId: string
  currentUsername: string
  onReply: () => void
  isReplying: boolean
  onEdit: (postId: string, newContent: string) => void
  onDelete: (postId: string) => void
  onTopicDeleted: () => void
  nested?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)
  const isOwn = post.author_id === currentUserId

  if (post.is_deleted) {
    return (
      <div className={`bg-[#161616] border border-[#2a2a2a] ${nested ? 'p-3' : 'p-3 sm:p-5'}`}>
        <p className="text-xs text-[#4a4a4a] italic ml-7 sm:ml-8">[silindi]</p>
      </div>
    )
  }

  async function saveEdit() {
    if (!editContent.trim()) return
    setEditLoading(true)
    try {
      const res = await fetch('/api/forum/reply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id, content: editContent.trim() }),
      })
      if (res.ok) {
        onEdit(post.id, editContent.trim())
        setEditing(false)
      }
    } finally {
      setEditLoading(false)
    }
  }

  async function deletePost() {
    setDeleteLoading(true)
    try {
      const res = await fetch('/api/forum/reply', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id }),
      })
      if (res.ok) {
        const data = await res.json() as { topicDeleted?: boolean }
        onDelete(post.id)
        if (data.topicDeleted) onTopicDeleted()
      }
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(false)
    }
  }

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
        {post.author?.username ? (
          <Link href={`/profile/${post.author.username}`} className="text-sm font-medium text-[#e8e8e8] hover:text-white hover:underline">{post.author.username}</Link>
        ) : (
          <span className="text-sm font-medium text-[#e8e8e8]">bilinmiyor</span>
        )}
        <span className="text-[11px] text-[#6b6b6b]">· {formatDistanceToNow(post.created_at)}</span>
        {isOwn && !editing && (
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => { setEditing(true); setEditContent(post.content); setTimeout(() => editRef.current?.focus(), 50) }} className="text-[#4a4a4a] hover:text-[#a0a0a0] transition-colors" title="Düzenle">
              <Pencil size={12} />
            </button>
            {deleteConfirm ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#6b6b6b]">Sil?</span>
                <button onClick={deletePost} disabled={deleteLoading} className="text-[10px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40">
                  {deleteLoading ? '...' : 'Evet'}
                </button>
                <button onClick={() => setDeleteConfirm(false)} className="text-[10px] text-[#6b6b6b] hover:text-white transition-colors">
                  <X size={10} />
                </button>
              </div>
            ) : (
              <button onClick={() => setDeleteConfirm(true)} className="text-[#4a4a4a] hover:text-red-400 transition-colors" title="Sil">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-2 ml-7 sm:ml-8">
          <textarea
            ref={editRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-[#e8e8e8] px-3 py-2 text-sm focus:outline-none focus:border-[#8b1a1a] resize-none"
          />
          <div className="flex items-center gap-2 mt-1.5">
            <button onClick={saveEdit} disabled={editLoading} className="text-xs bg-[#8b1a1a] hover:bg-[#a82020] text-white px-3 py-1.5 transition-colors disabled:opacity-50">
              {editLoading ? '...' : 'Kaydet'}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-[#6b6b6b] hover:text-white transition-colors">
              İptal
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-sm text-[#c8c8c8] leading-relaxed whitespace-pre-wrap ml-7 sm:ml-8">
          {renderContent(post.content)}
        </div>
      )}

      {!editing && <PostImages images={postImages} />}

      {!editing && postPoll && (
        <div className="mt-3 ml-7 sm:ml-8">
          <PollWidget
            pollId={postPoll.poll.id}
            question={postPoll.poll.question}
            initialVotes={postPoll.votes}
            initialUserVote={postPoll.userVote}
          />
        </div>
      )}

      {!editing && (
        <div className="ml-7 sm:ml-8 mt-2">
          <ReactionBar
            targetId={post.id}
            targetType="post"
            initialReactions={postReactions}
            currentUsername={currentUsername}
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
