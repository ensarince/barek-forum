'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, User, X } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'
import PostImages from './PostImages'
import ReactionBar from './ReactionBar'
import { renderContent } from '@/lib/renderContent'
import type { TopicWithMeta, Image as ImageRow, ReactionGroup } from '@/types/database'

interface OpeningPostProps {
  topic: TopicWithMeta
  images: ImageRow[]
  currentUserId: string
  currentUsername: string
  initialReactions: ReactionGroup[]
}

export default function OpeningPost({ topic, images, currentUserId, currentUsername, initialReactions }: OpeningPostProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(topic.content)
  const [liveContent, setLiveContent] = useState(topic.content)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)
  const isOwn = topic.author_id === currentUserId

  async function saveEdit() {
    if (!editContent.trim()) return
    setEditLoading(true)
    try {
      const res = await fetch('/api/forum/topic', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topic.id, content: editContent.trim() }),
      })
      if (res.ok) {
        setLiveContent(editContent.trim())
        setEditing(false)
      }
    } finally {
      setEditLoading(false)
    }
  }

  async function deleteTopic() {
    setDeleteLoading(true)
    try {
      const res = await fetch('/api/forum/topic', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topic.id }),
      })
      if (res.ok) router.push('/')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(false)
    }
  }

  return (
    <div className="bg-[#161616] border border-[#2a2a2a] p-3 sm:p-5 mb-6">
      <div className="flex items-center gap-2.5">
        {topic.author?.avatar_url ? (
          <img src={topic.author.avatar_url} alt="" className="w-7 h-7 object-cover border border-[#2a2a2a] shrink-0" />
        ) : (
          <div className="w-7 h-7 bg-[#2a2a2a] flex items-center justify-center shrink-0">
            <User size={14} className="text-[#6b6b6b]" />
          </div>
        )}
        {topic.author?.username ? (
          <Link href={`/profile/${topic.author.username}`} className="text-sm font-medium text-[#e8e8e8] hover:text-white hover:underline">{topic.author.username}</Link>
        ) : (
          <span className="text-sm font-medium text-[#e8e8e8]">bilinmiyor</span>
        )}
        <span className="text-[11px] text-[#6b6b6b]">· {formatDistanceToNow(topic.created_at)}</span>

        {isOwn && !editing && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setEditing(true); setEditContent(liveContent); setTimeout(() => editRef.current?.focus(), 50) }}
              className="text-[#4a4a4a] hover:text-[#a0a0a0] transition-colors"
              title="Düzenle"
            >
              <Pencil size={13} />
            </button>
            {deleteConfirm ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#6b6b6b]">Sil?</span>
                <button onClick={deleteTopic} disabled={deleteLoading} className="text-[10px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40">
                  {deleteLoading ? '...' : 'Evet'}
                </button>
                <button onClick={() => setDeleteConfirm(false)} className="text-[10px] text-[#6b6b6b] hover:text-white transition-colors">
                  <X size={10} />
                </button>
              </div>
            ) : (
              <button onClick={() => setDeleteConfirm(true)} className="text-[#4a4a4a] hover:text-red-400 transition-colors" title="Sil">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-3">
          <textarea
            ref={editRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={6}
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
        <div className="mt-3 text-sm text-[#e8e8e8] leading-relaxed whitespace-pre-wrap">
          {renderContent(liveContent)}
        </div>
      )}

      {!editing && images.length > 0 && <PostImages images={images} />}

      {!editing && (
        <div className="mt-3">
          <ReactionBar
            targetId={topic.id}
            targetType="topic"
            initialReactions={initialReactions}
            currentUsername={currentUsername}
          />
        </div>
      )}
    </div>
  )
}
