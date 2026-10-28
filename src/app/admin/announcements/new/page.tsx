'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewAnnouncementPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!title.trim() || !content.trim()) {
      setError('Başlık ve içerik zorunludur')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/forum/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), type: 'announcement' }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Hata')
      }
      router.push('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Duyuru gönderilemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xs uppercase tracking-[0.25em] text-[#8a8a8a] mb-6">Yeni Duyuru</h1>

      <div className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-[#8a8a8a] block mb-1.5">Başlık</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Duyuru başlığı"
            className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-[#e05a4a] placeholder-[#8a8a8a]"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-[#8a8a8a] block mb-1.5">İçerik</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="Duyuru içeriği..."
            className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-[#e05a4a] placeholder-[#8a8a8a] resize-y leading-relaxed"
          />
        </div>

        {error && <p className="text-[#e05a4a] text-sm">{error}</p>}

        <button
          onClick={submit}
          disabled={loading}
          className="px-6 py-3 bg-[#8b1a1a] hover:bg-[#a82020] text-white text-xs uppercase tracking-widest transition-colors disabled:opacity-40"
        >
          {loading ? 'Yayınlanıyor...' : 'Duyuruyu Yayınla'}
        </button>
      </div>
    </div>
  )
}
