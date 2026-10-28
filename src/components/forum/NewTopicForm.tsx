'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageUpload from './ImageUpload'
import type { Sector } from '@/types/database'

const GENERAL_TAGS = ['Genel', 'Soru', 'Beta', 'Ekipman', 'Güvenlik', 'Etkinlik']

interface NewTopicFormProps {
  sectors: Sector[]
  isAdmin: boolean
}

export default function NewTopicForm({ sectors, isAdmin }: NewTopicFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  // tag = a general tag string, sectorId = a sector uuid — only one can be set at a time
  const [tag, setTag] = useState<string | null>(null)
  const [sectorId, setSectorId] = useState<string | null>(null)
  const [withPoll, setWithPoll] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function selectGeneralTag(t: string) {
    setSectorId(null)
    setTag((prev) => (prev === t ? null : t))
  }

  function selectSector(id: string) {
    setTag(null)
    setSectorId((prev) => (prev === id ? null : id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (title.trim().length < 3) { setError('Başlık en az 3 karakter olmalı.'); return }
    if (!content.trim()) { setError('İçerik boş olamaz.'); return }

    setLoading(true)

    // try/finally so a network error or a non-JSON response never leaves the form stuck on "Gönderiliyor..."
    try {
      // Upload images first
      const uploadedImages: { url: string; publicId: string }[] = []
      for (let i = 0; i < pendingFiles.length; i++) {
        setUploadStatus(`Fotoğraflar yükleniyor... (${i + 1}/${pendingFiles.length})`)
        const fd = new FormData()
        fd.append('file', pendingFiles[i])
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
        const upData = await upRes.json().catch(() => ({})) as { url?: string; publicId?: string; error?: string }
        if (!upRes.ok) {
          setError(upData.error ?? (upRes.status === 413 ? 'Fotoğraf çok büyük.' : 'Fotoğraf yüklenemedi.'))
          return
        }
        uploadedImages.push({ url: upData.url!, publicId: upData.publicId! })
      }
      setUploadStatus(null)

      const res = await fetch('/api/forum/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          sector_id: sectorId ?? undefined,
          tag: tag ?? undefined,
          with_poll: withPoll,
          images: uploadedImages,
        }),
      })

      const resData = await res.json().catch(() => ({})) as { topicId?: string; error?: string }

      if (!res.ok) {
        setError(resData.error ?? 'Bir hata oluştu.')
        return
      }

      if (isAdmin && resData.topicId) {
        router.push(`/topics/${resData.topicId}`)
        return
      }

      setSubmitted(true)
    } catch {
      setError('Sunucuya bağlanılamadı.')
    } finally {
      setLoading(false)
      setUploadStatus(null)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="text-[#e05a4a] text-4xl mb-4" aria-hidden="true">⧖</div>
        <h1 className="text-lg font-bold text-white uppercase tracking-widest mb-2">Konu Gönderildi</h1>
        <p className="text-[#8a8a8a] text-sm leading-relaxed">
          Konun admin onayı bekliyor. Onaylandığında forumda yayınlanacak.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-6 px-4">
      <h1 className="text-xs uppercase tracking-[0.2em] text-[#8a8a8a] mb-6">Yeni Konu</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="topic-title" className="block text-xs uppercase tracking-[0.15em] text-[#8a8a8a] mb-1">Başlık</label>
          <input
            id="topic-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Konu başlığı..."
            maxLength={200}
            className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-[#e05a4a] placeholder-[#8a8a8a]"
          />
        </div>

        {/* Tag selector */}
        <fieldset>
          <legend className="block text-xs uppercase tracking-[0.15em] text-[#8a8a8a] mb-2">
            Etiket <span className="normal-case tracking-normal text-[#8a8a8a] ml-1">— isteğe bağlı</span>
          </legend>

          {/* General tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {GENERAL_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => selectGeneralTag(t)}
                aria-pressed={tag === t}
                className={`px-3 py-2 text-xs border transition-colors ${
                  tag === t
                    ? 'bg-[#8b1a1a] border-[#8b1a1a] text-white'
                    : 'bg-transparent border-[#2a2a2a] text-[#8a8a8a] hover:border-[#8b1a1a] hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Sector divider */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-wider text-[#8a8a8a]">Sektörler</span>
            <div className="flex-1 border-t border-[#1e1e1e]" />
          </div>

          {/* Sector chips */}
          <div className="flex flex-wrap gap-1.5">
            {sectors.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSector(s.id)}
                aria-pressed={sectorId === s.id}
                className={`px-3 py-2 text-xs border transition-colors ${
                  sectorId === s.id
                    ? 'bg-[#8b1a1a] border-[#8b1a1a] text-white'
                    : 'bg-transparent border-[#2a2a2a] text-[#8a8a8a] hover:border-[#8b1a1a] hover:text-white'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Content */}
        <div>
          <label htmlFor="topic-content" className="block text-xs uppercase tracking-[0.15em] text-[#8a8a8a] mb-1">Açıklama</label>
          <textarea
            id="topic-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Konuyu detaylı anlat..."
            className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-[#e05a4a] placeholder-[#8a8a8a] resize-none"
          />
          <div className="mt-2">
            <ImageUpload onImagesChange={setPendingFiles} maxImages={5} />
          </div>
          {uploadStatus && <p aria-live="polite" className="text-[#8a8a8a] text-xs mt-1">{uploadStatus}</p>}
        </div>

        {/* Poll toggle */}
        <div>
          <button
            type="button"
            role="switch"
            aria-checked={withPoll}
            onClick={() => setWithPoll(!withPoll)}
            className="flex items-center gap-3 py-1 group"
          >
            <span
              className={`w-10 h-5 border transition-colors flex items-center shrink-0 ${withPoll ? 'bg-[#8b1a1a] border-[#8b1a1a]' : 'bg-[#0d0d0d] border-[#2a2a2a]'}`}
            >
              <span className={`w-3 h-3 bg-white transition-transform mx-1 ${withPoll ? 'translate-x-4' : 'translate-x-0'}`} />
            </span>
            <span className="text-xs uppercase tracking-[0.15em] text-[#8a8a8a] group-hover:text-white transition-colors">
              Derece anketi ekle
            </span>
          </button>
          {withPoll && (
            <p className="text-[11px] text-[#8a8a8a] mt-1.5 ml-13">
              Üyeler Fontainebleau skalasında rota derecesini oylarıyla belirler.
            </p>
          )}
        </div>

        {error && <p role="alert" className="text-[#e05a4a] text-sm">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#8b1a1a] hover:bg-[#a82020] text-white px-6 py-2.5 text-sm font-semibold uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            {loading ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </div>
      </form>
    </div>
  )
}
