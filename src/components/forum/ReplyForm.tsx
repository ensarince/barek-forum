'use client'

import { useState } from 'react'
import type { PostWithAuthor } from '@/types/database'

interface ReplyFormProps {
  topicId: string
  parentPostId: string | null
  authorId: string
  authorUsername: string
  authorAvatarUrl: string | null
  onSuccess: (newPost: PostWithAuthor) => void
  onCancel?: () => void
  compact?: boolean
}

export default function ReplyForm({
  topicId,
  parentPostId,
  authorId,
  authorUsername,
  authorAvatarUrl,
  onSuccess,
  onCancel,
  compact = false,
}: ReplyFormProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (content.trim().length < 10) {
      setError('Yanıt en az 10 karakter olmalı.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/forum/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: topicId,
          content: content.trim(),
          parent_post_id: parentPostId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Bir hata oluştu.')
        return
      }

      // Build optimistic post object
      const optimisticPost: PostWithAuthor = {
        id: (data as { post?: { id: string } }).post?.id ?? `tmp-${Date.now()}`,
        topic_id: topicId,
        author_id: authorId,
        content: content.trim(),
        parent_post_id: parentPostId,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: { username: authorUsername, avatar_url: authorAvatarUrl },
      }

      setContent('')
      onSuccess(optimisticPost)
      onCancel?.()
    } catch {
      setError('Sunucuya bağlanılamadı.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'mt-3' : 'mt-8 border-t border-[#2a2a2a] pt-6'}>
      {!compact && (
        <p className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-3">Yanıtla</p>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={compact ? 3 : 4}
        placeholder="Yanıtını yaz..."
        autoFocus={compact}
        className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b] resize-none"
      />
      {error && <p className="text-[#c0392b] text-xs mt-1">{error}</p>}
      <div className="flex items-center gap-2 justify-end mt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-[#6b6b6b] hover:text-white px-3 py-2 transition-colors"
          >
            İptal
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-[#8b1a1a] hover:bg-[#a82020] text-white px-4 py-2 text-sm font-semibold uppercase tracking-widest transition-colors disabled:opacity-50"
        >
          {loading ? 'Gönderiliyor...' : 'Yanıtla'}
        </button>
      </div>
    </form>
  )
}
