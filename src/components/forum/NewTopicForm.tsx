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
        setLoading(false)
        setUploadStatus(null)
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
      setLoading(false)
      return
    }

    if (isAdmin && resData.topicId) {
      router.push(`/topics/${resData.topicId}`)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="text-[#8b1a1a] text-4xl mb-4">⧖</div>
        <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-2">Konu Gönderildi</h2>
        <p className="text-[#6b6b6b] text-sm leading-relaxed">
          Konun admin onayı bekliyor. Onaylandığında forumda yayınlanacak.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-6 px-4">
      <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-6">Yeni Konu</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-xs uppercase tracking-[0.15em] text-[#6b6b6b] mb-1">Başlık</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Konu başlığı..."
            className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b]"
          />
        </div>

        {/* Tag selector */}
        <div>
          <label className="block text-xs uppercase tracking-[0.15em] text-[#6b6b6b] mb-2">
            Etiket <span className="normal-case tracking-normal text-[#4a4a4a] ml-1">— isteğe bağlı</span>
          </label>

          {/* General tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {GENERAL_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => selectGeneralTag(t)}
                className={`px-3 py-1.5 text-xs border transition-colors ${
                  tag === t
                    ? 'bg-[#8b1a1a] border-[#8b1a1a] text-white'
                    : 'bg-transparent border-[#2a2a2a] text-[#6b6b6b] hover:border-[#8b1a1a] hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Sector divider */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-wider text-[#4a4a4a]">Sektörler</span>
            <div className="flex-1 border-t border-[#1e1e1e]" />
          </div>

          {/* Sector chips */}
          <div className="flex flex-wrap gap-1.5">
            {sectors.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSector(s.id)}
                className={`px-3 py-1.5 text-xs border transition-colors ${
                  sectorId === s.id
                    ? 'bg-[#8b1a1a] border-[#8b1a1a] text-white'
                    : 'bg-transparent border-[#2a2a2a] text-[#6b6b6b] hover:border-[#8b1a1a] hover:text-white'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs uppercase tracking-[0.15em] text-[#6b6b6b] mb-1">Açıklama</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Konuyu detaylı anlat..."
            className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b] resize-none"
          />
          <div className="mt-2">
            <ImageUpload onImagesChange={setPendingFiles} maxImages={5} />
          </div>
          {uploadStatus && <p className="text-[#6b6b6b] text-xs mt-1">{uploadStatus}</p>}
        </div>

        {/* Poll toggle */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => setWithPoll(!withPoll)}
              className={`w-10 h-5 border transition-colors flex items-center shrink-0 ${withPoll ? 'bg-[#8b1a1a] border-[#8b1a1a]' : 'bg-[#0d0d0d] border-[#2a2a2a]'}`}
            >
              <div className={`w-3 h-3 bg-white transition-transform mx-1 ${withPoll ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-xs uppercase tracking-[0.15em] text-[#6b6b6b] group-hover:text-white transition-colors">
              Derece anketi ekle
            </span>
          </label>
          {withPoll && (
            <p className="text-[11px] text-[#4a4a4a] mt-1.5 ml-13">
              Üyeler Fontainebleau skalasında rota derecesini oylarıyla belirler.
            </p>
          )}
        </div>

        {error && <p className="text-[#c0392b] text-sm">{error}</p>}

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
