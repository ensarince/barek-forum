'use client'

import { useRef, useState } from 'react'
import { BarChart2, Smile, X } from 'lucide-react'
import ImageUpload from './ImageUpload'
import EmojiPicker from './EmojiPicker'
import GifPicker from './GifPicker'
import MentionDropdown from './MentionDropdown'
import type { PostWithAuthor, Image as ImageRow, Poll } from '@/types/database'

interface MentionUser {
  username: string
  avatar_url: string | null
}

interface GifItem {
  id: string
  title: string
  previewUrl: string
  url: string
}

interface ReplyFormProps {
  topicId: string
  parentPostId: string | null
  authorId: string
  authorUsername: string
  authorAvatarUrl: string | null
  onSuccess: (newPost: PostWithAuthor, images: ImageRow[], poll?: Poll | null) => void
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingGifs, setPendingGifs] = useState<GifItem[]>([])
  const [withPoll, setWithPoll] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([])
  const [mentionLoading, setMentionLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function insertEmoji(emoji: string) {
    const el = textareaRef.current
    if (!el) { setContent((c) => c + emoji); return }
    const start = el.selectionStart ?? content.length
    const end = el.selectionEnd ?? content.length
    const next = content.slice(0, start) + emoji + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setContent(val)
    const cursor = e.target.selectionStart ?? val.length
    const textBefore = val.slice(0, cursor)
    const match = textBefore.match(/(?:^|[\s\n])@(\w*)$/)
    if (match) {
      const query = match[1]
      setMentionQuery(query)
      if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current)
      mentionDebounceRef.current = setTimeout(async () => {
        setMentionLoading(true)
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
          const data = await res.json() as { users: MentionUser[] }
          setMentionUsers(data.users ?? [])
        } catch {
          setMentionUsers([])
        } finally {
          setMentionLoading(false)
        }
      }, 150)
    } else {
      setMentionQuery(null)
      setMentionUsers([])
    }
  }

  function insertMention(username: string) {
    const el = textareaRef.current
    if (!el) return
    const cursor = el.selectionStart ?? content.length
    const textBefore = content.slice(0, cursor)
    const match = textBefore.match(/(?:^|[\s\n])@(\w*)$/)
    if (!match) return
    const atIndex = match.index! + (match[0].startsWith('@') ? 0 : 1)
    const before = content.slice(0, atIndex)
    const after = content.slice(cursor)
    const newContent = before + `@${username} ` + after
    setContent(newContent)
    setMentionQuery(null)
    setMentionUsers([])
    const newCursor = atIndex + username.length + 2
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newCursor, newCursor)
    })
  }

  function addGif(gif: GifItem) {
    setPendingGifs((prev) => prev.length < 3 ? [...prev, gif] : prev)
  }

  function removeGif(id: string) {
    setPendingGifs((prev) => prev.filter((g) => g.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() && pendingFiles.length === 0 && pendingGifs.length === 0) {
      setError('Yanıt boş olamaz.')
      return
    }
    setLoading(true)
    setError(null)
    setUploadStatus(null)

    try {
      // Upload images first
      const uploadedImages: { url: string; publicId: string }[] = []

      for (let i = 0; i < pendingFiles.length; i++) {
        setUploadStatus(`Fotoğraflar yükleniyor... (${i + 1}/${pendingFiles.length})`)
        const fd = new FormData()
        fd.append('file', pendingFiles[i])
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
        const upData = await upRes.json() as { url?: string; publicId?: string; error?: string }
        if (!upRes.ok) {
          setError(upData.error ?? 'Fotoğraf yüklenemedi.')
          return
        }
        uploadedImages.push({ url: upData.url!, publicId: upData.publicId! })
      }

      setUploadStatus(null)

      // Append selected GIFs as image entries (Giphy CDN URLs, no upload needed)
      const gifImages = pendingGifs.map((g) => ({ url: g.url, publicId: `giphy_${g.id}` }))

      const res = await fetch('/api/forum/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: topicId,
          content: content.trim(),
          parent_post_id: parentPostId,
          images: [...uploadedImages, ...gifImages],
          with_poll: withPoll,
        }),
      })

      const data = await res.json() as { post?: { id: string }; images?: ImageRow[]; poll?: Poll; error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Bir hata oluştu.')
        return
      }

      const optimisticPost: PostWithAuthor = {
        id: data.post?.id ?? `tmp-${Date.now()}`,
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
      setPendingFiles([])
      setPendingGifs([])
      setWithPoll(false)
      onSuccess(optimisticPost, data.images ?? [], data.poll ?? null)
      onCancel?.()
    } catch {
      setError('Sunucuya bağlanılamadı.')
    } finally {
      setLoading(false)
      setUploadStatus(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'mt-3' : 'mt-8 border-t border-[#2a2a2a] pt-6'}>
      {!compact && (
        <p className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-3">Yanıtla</p>
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={(e) => {
            if (mentionQuery !== null && e.key === 'Escape') {
              setMentionQuery(null)
              setMentionUsers([])
            }
          }}
          rows={compact ? 3 : 4}
          placeholder="Yanıtını yaz..."
          autoFocus={compact}
          className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b] resize-none"
        />
        {mentionQuery !== null && (
          <MentionDropdown
            users={mentionUsers}
            loading={mentionLoading}
            onSelect={insertMention}
          />
        )}
      </div>
      {error && <p className="text-[#c0392b] text-xs mt-1">{error}</p>}
      {uploadStatus && <p className="text-[#6b6b6b] text-xs mt-1">{uploadStatus}</p>}

      {/* Pending GIF previews */}
      {pendingGifs.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {pendingGifs.map((gif) => (
            <div key={gif.id} className="relative">
              <img src={gif.previewUrl} alt={gif.title} className="h-16 object-cover border border-[#2a2a2a]" />
              <button
                type="button"
                onClick={() => removeGif(gif.id)}
                className="absolute -top-1.5 -right-1.5 bg-[#8b1a1a] rounded-full p-0.5"
              >
                <X size={10} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 justify-between mt-2">
        <div className="relative flex items-center gap-2">
          <ImageUpload onImagesChange={setPendingFiles} maxImages={5} />

          {/* Emoji button */}
          <button
            type="button"
            onClick={() => { setShowEmoji(!showEmoji); setShowGif(false) }}
            title="Emoji ekle"
            className={`flex items-center gap-1 px-2.5 py-2 border text-xs transition-colors ${
              showEmoji ? 'border-[#8b1a1a] bg-[#8b1a1a] text-white' : 'border-[#2a2a2a] text-[#6b6b6b] hover:border-[#8b1a1a] hover:text-white'
            }`}
          >
            <Smile size={14} />
          </button>
          {showEmoji && (
            <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
          )}

          {/* GIF button */}
          <button
            type="button"
            onClick={() => { setShowGif(!showGif); setShowEmoji(false) }}
            title="GIF ekle"
            className={`flex items-center px-2.5 py-2 border text-xs font-bold transition-colors ${
              showGif ? 'border-[#8b1a1a] bg-[#8b1a1a] text-white' : 'border-[#2a2a2a] text-[#6b6b6b] hover:border-[#8b1a1a] hover:text-white'
            }`}
          >
            GIF
          </button>
          {showGif && (
            <GifPicker onSelect={addGif} onClose={() => setShowGif(false)} />
          )}

          {/* Poll toggle */}
          <button
            type="button"
            onClick={() => setWithPoll(!withPoll)}
            title="Derece anketi ekle"
            className={`flex items-center gap-1.5 px-2.5 py-2 border text-xs transition-colors ${
              withPoll ? 'border-[#8b1a1a] bg-[#8b1a1a] text-white' : 'border-[#2a2a2a] text-[#6b6b6b] hover:border-[#8b1a1a] hover:text-white'
            }`}
          >
            <BarChart2 size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
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
            {loading ? (uploadStatus ? '...' : 'Gönderiliyor...') : 'Yanıtla'}
          </button>
        </div>
      </div>
      {withPoll && (
        <p className="text-[11px] text-[#4a4a4a] mt-1.5">
          Bu yanıta derece anketi eklenecek — üyeler Font skalasında oy verebilir.
        </p>
      )}
    </form>
  )
}
