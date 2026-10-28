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
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)
  const isOwn = topic.author_id === currentUserId

  async function saveEdit() {
    if (!editContent.trim()) return
    setEditLoading(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/forum/topic', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topic.id, content: editContent.trim() }),
      })
      if (res.ok) {
        setLiveContent(editContent.trim())
        setEditing(false)
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setDeleteError(data.error ?? 'Kaydedilemedi.')
      }
    } catch {
      setDeleteError('Sunucuya bağlanılamadı.')
    } finally {
      setEditLoading(false)
    }
  }

  async function deleteTopic() {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/forum/topic', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topic.id }),
      })
      if (res.ok) {
        router.push('/')
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setDeleteError(data.error ?? 'Silme başarısız.')
      }
    } catch {
      setDeleteError('Sunucuya bağlanılamadı.')
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
            <User size={14} className="text-[#8a8a8a]" />
          </div>
        )}
        {topic.author?.username ? (
          <Link href={`/profile/${topic.author.username}`} className="text-sm font-medium text-[#e8e8e8] hover:text-white hover:underline truncate min-w-0">{topic.author.username}</Link>
        ) : (
          <span className="text-sm font-medium text-[#e8e8e8]">bilinmiyor</span>
        )}
        <span className="text-[11px] text-[#8a8a8a] shrink-0">· {formatDistanceToNow(topic.created_at)}</span>

        {isOwn && !editing && (
          <div className="ml-auto flex items-center gap-1 -my-2 shrink-0">
            <button
              onClick={() => { setEditing(true); setEditContent(liveContent); setTimeout(() => editRef.current?.focus(), 50) }}
              className="p-2.5 text-[#8a8a8a] hover:text-white transition-colors"
              title="Düzenle"
              aria-label="Konuyu düzenle"
            >
              <Pencil size={15} />
            </button>
            {deleteConfirm ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#8a8a8a]">Sil?</span>
                <button onClick={deleteTopic} disabled={deleteLoading} className="px-2.5 py-2 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40">
                  {deleteLoading ? '...' : 'Evet'}
                </button>
                <button onClick={() => setDeleteConfirm(false)} className="p-2.5 text-[#8a8a8a] hover:text-white transition-colors" aria-label="Silmeyi iptal et">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => setDeleteConfirm(true)} className="p-2.5 text-[#8a8a8a] hover:text-red-400 transition-colors" title="Sil" aria-label="Konuyu sil">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>
      {deleteError && <p role="alert" className="text-[#e05a4a] text-xs mt-2">{deleteError}</p>}

      {editing ? (
        <div className="mt-3">
          <textarea
            ref={editRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={6}
            aria-label="Konuyu düzenle"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-[#e8e8e8] px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-[#e05a4a] resize-none"
          />
          <div className="flex items-center gap-2 mt-1.5">
            <button onClick={saveEdit} disabled={editLoading} className="text-xs bg-[#8b1a1a] hover:bg-[#a82020] text-white px-4 py-2.5 transition-colors disabled:opacity-50">
              {editLoading ? '...' : 'Kaydet'}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-[#8a8a8a] hover:text-white px-3 py-2.5 transition-colors">
              İptal
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-sm text-[#e8e8e8] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
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
