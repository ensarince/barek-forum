'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart2, Smile, X } from 'lucide-react'
import ImageUpload from './ImageUpload'
import EmojiPicker from './EmojiPicker'
import GifPicker from './GifPicker'
import MentionDropdown from './MentionDropdown'
import type { PostWithAuthor, Image as ImageRow, Poll } from '@/types/database'

// Photos + GIFs together — the server rejects more than this
const MAX_ATTACHMENTS = 5

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
  /** Pre-filled text, e.g. "@username " when answering a nested reply */
  initialContent?: string
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
  initialContent = '',
}: ReplyFormProps) {
  const [content, setContent] = useState(initialContent)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingGifs, setPendingGifs] = useState<GifItem[]>([])
  const [uploadKey, setUploadKey] = useState(0)
  const [withPoll, setWithPoll] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([])
  const [mentionLoading, setMentionLoading] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const gifButtonRef = useRef<HTMLButtonElement>(null)
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mentionRequestRef = useRef(0)

  useEffect(() => () => {
    if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current)
  }, [])

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

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
      autoResize(el)
    })
  }

  function closeMentions() {
    mentionRequestRef.current++
    setMentionQuery(null)
    setMentionUsers([])
    setMentionIndex(0)
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setContent(val)
    autoResize(e.target)
    const cursor = e.target.selectionStart ?? val.length
    const textBefore = val.slice(0, cursor)
    const match = textBefore.match(/(?:^|[\s\n])@(\w*)$/)
    if (match) {
      const query = match[1]
      setMentionQuery(query)
      setMentionIndex(0)
      if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current)
      mentionDebounceRef.current = setTimeout(async () => {
        // Ignore responses from older keystrokes that arrive late
        const requestId = ++mentionRequestRef.current
        setMentionLoading(true)
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
          const data = await res.json() as { users: MentionUser[] }
          if (requestId === mentionRequestRef.current) setMentionUsers(data.users ?? [])
        } catch {
          if (requestId === mentionRequestRef.current) setMentionUsers([])
        } finally {
          if (requestId === mentionRequestRef.current) setMentionLoading(false)
        }
      }, 150)
    } else if (mentionQuery !== null) {
      closeMentions()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery === null) return
    if (e.key === 'Escape') {
      closeMentions()
      return
    }
    if (mentionUsers.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMentionIndex((i) => (i + 1) % mentionUsers.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMentionIndex((i) => (i - 1 + mentionUsers.length) % mentionUsers.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertMention(mentionUsers[mentionIndex]?.username ?? mentionUsers[0].username)
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
    closeMentions()
    const newCursor = atIndex + username.length + 2
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newCursor, newCursor)
      autoResize(el)
    })
  }

  function addGif(gif: GifItem) {
    setPendingGifs((prev) => prev.length + pendingFiles.length < MAX_ATTACHMENTS ? [...prev, gif] : prev)
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
    if (pendingFiles.length + pendingGifs.length > MAX_ATTACHMENTS) {
      setError(`En fazla ${MAX_ATTACHMENTS} fotoğraf/GIF eklenebilir.`)
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
        // Non-JSON bodies (e.g. a 413 from the host) must not throw us into "server unreachable"
        const upData = await upRes.json().catch(() => ({})) as { url?: string; publicId?: string; error?: string }
        if (!upRes.ok) {
          setError(upData.error ?? (upRes.status === 413 ? 'Fotoğraf çok büyük.' : 'Fotoğraf yüklenemedi.'))
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

      const data = await res.json().catch(() => ({})) as { post?: { id: string }; images?: ImageRow[]; poll?: Poll; error?: string }

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
      setUploadKey((k) => k + 1) // remount ImageUpload so its previews/files are cleared too
      setWithPoll(false)
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      onSuccess(optimisticPost, data.images ?? [], data.poll ?? null)
      onCancel?.()
    } catch {
      setError('Sunucuya bağlanılamadı.')
    } finally {
      setLoading(false)
      setUploadStatus(null)
    }
  }

  const attachmentCount = pendingFiles.length + pendingGifs.length

  return (
    <form onSubmit={handleSubmit} className={compact ? 'mt-3' : 'mt-8 border-t border-[#2a2a2a] pt-6'}>
      {!compact && (
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a8a8a] mb-3">Yanıtla</p>
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder="Yanıtını yaz..."
          aria-label="Yanıt"
          aria-autocomplete="list"
          aria-controls={mentionQuery !== null ? 'mention-listbox' : undefined}
          aria-activedescendant={mentionQuery !== null && mentionUsers.length > 0 ? `mention-option-${mentionIndex}` : undefined}
          autoFocus={compact}
          className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-[#e05a4a] placeholder-[#8a8a8a] resize-none overflow-y-auto"
          style={{ minHeight: compact ? '80px' : '100px', maxHeight: '400px' }}
        />
        {mentionQuery !== null && (
          <MentionDropdown
            users={mentionUsers}
            loading={mentionLoading}
            onSelect={insertMention}
            activeIndex={mentionIndex}
          />
        )}
      </div>
      {error && <p role="alert" className="text-[#e05a4a] text-xs mt-1">{error}</p>}
      {uploadStatus && <p aria-live="polite" className="text-[#8a8a8a] text-xs mt-1">{uploadStatus}</p>}

      {/* Pending GIF previews */}
      {pendingGifs.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {pendingGifs.map((gif) => (
            <div key={gif.id} className="relative">
              <img src={gif.previewUrl} alt={gif.title} className="h-16 object-cover border border-[#2a2a2a]" />
              <button
                type="button"
                onClick={() => removeGif(gif.id)}
                aria-label="GIF'i kaldır"
                className="absolute -top-2.5 -right-2.5 w-7 h-7 flex items-center justify-center"
              >
                <span className="w-5 h-5 bg-[#8b1a1a] rounded-full flex items-center justify-center">
                  <X size={12} className="text-white" />
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 justify-between mt-2 flex-wrap">
        <div className="relative flex items-center gap-1.5 sm:gap-2">
          <ImageUpload key={uploadKey} onImagesChange={setPendingFiles} maxImages={MAX_ATTACHMENTS - pendingGifs.length} />

          {/* Emoji button */}
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={() => { setShowEmoji(!showEmoji); setShowGif(false) }}
            title="Emoji ekle"
            aria-label="Emoji ekle"
            aria-expanded={showEmoji}
            className={`flex items-center gap-1 px-3 py-2.5 border text-xs transition-colors ${
              showEmoji ? 'border-[#8b1a1a] bg-[#8b1a1a] text-white' : 'border-[#2a2a2a] text-[#8a8a8a] hover:border-[#8b1a1a] hover:text-white'
            }`}
          >
            <Smile size={14} />
          </button>
          {showEmoji && (
            <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} toggleRef={emojiButtonRef} />
          )}

          {/* GIF button */}
          <button
            ref={gifButtonRef}
            type="button"
            onClick={() => { setShowGif(!showGif); setShowEmoji(false) }}
            disabled={!showGif && attachmentCount >= MAX_ATTACHMENTS}
            title="GIF ekle"
            aria-label="GIF ekle"
            aria-expanded={showGif}
            className={`flex items-center px-3 py-2.5 border text-xs font-bold transition-colors disabled:opacity-40 ${
              showGif ? 'border-[#8b1a1a] bg-[#8b1a1a] text-white' : 'border-[#2a2a2a] text-[#8a8a8a] hover:border-[#8b1a1a] hover:text-white'
            }`}
          >
            GIF
          </button>
          {showGif && (
            <GifPicker onSelect={addGif} onClose={() => setShowGif(false)} toggleRef={gifButtonRef} />
          )}

          {/* Poll toggle */}
          <button
            type="button"
            onClick={() => setWithPoll(!withPoll)}
            title="Derece anketi ekle"
            aria-label="Derece anketi ekle"
            aria-pressed={withPoll}
            className={`flex items-center gap-1.5 px-3 py-2.5 border text-xs transition-colors ${
              withPoll ? 'border-[#8b1a1a] bg-[#8b1a1a] text-white' : 'border-[#2a2a2a] text-[#8a8a8a] hover:border-[#8b1a1a] hover:text-white'
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
              className="text-xs text-[#8a8a8a] hover:text-white px-3 py-2.5 transition-colors"
            >
              İptal
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="bg-[#8b1a1a] hover:bg-[#a82020] text-white px-4 py-2.5 text-sm font-semibold uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            {loading ? (uploadStatus ? '...' : 'Gönderiliyor...') : 'Yanıtla'}
          </button>
        </div>
      </div>
      {withPoll && (
        <p className="text-[11px] text-[#8a8a8a] mt-1.5">
          Bu yanıta derece anketi eklenecek — üyeler Font skalasında oy verebilir.
        </p>
      )}
    </form>
  )
}
