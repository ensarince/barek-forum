'use client'

import { useState } from 'react'
import type { Sector } from '@/types/database'

interface NewTopicFormProps {
  sectors: Sector[]
}

export default function NewTopicForm({ sectors }: NewTopicFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [withPoll, setWithPoll] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (title.trim().length < 3) { setError('Başlık en az 3 karakter olmalı.'); return }
    if (!content.trim()) { setError('İçerik boş olamaz.'); return }
    if (!sectorId) { setError('Sektör seçmelisin.'); return }

    setLoading(true)
    const res = await fetch('/api/forum/topic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), content: content.trim(), sector_id: sectorId, with_poll: withPoll }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError((data as { error?: string }).error ?? 'Bir hata oluştu.')
      setLoading(false)
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
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-6">Yeni Konu</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div>
          <label className="block text-xs uppercase tracking-[0.15em] text-[#6b6b6b] mb-1">Sektör</label>
          <select
            value={sectorId}
            onChange={(e) => setSectorId(e.target.value)}
            className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm focus:outline-none focus:border-[#8b1a1a]"
          >
            <option value="" className="bg-[#161616]">Sektör seç...</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#161616]">{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.15em] text-[#6b6b6b] mb-1">İçerik</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Konuyu detaylı anlat..."
            className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b] resize-none"
          />
        </div>

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
