'use client'

import { useState, useEffect } from 'react'
import { X, Bug } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function BugReportModal({ isOpen, onClose }: Props) {
  const [description, setDescription] = useState('')
  const [pageUrl, setPageUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setPageUrl(window.location.href)
      setDescription('')
      setSuccess(false)
      setError(null)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (description.trim().length < 10) {
      setError('En az 10 karakter gir.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), pageUrl }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) {
        setError(json.error ?? 'Bir hata oluştu.')
        return
      }
      setSuccess(true)
    } catch {
      setError('Bir hata oluştu. Tekrar dene.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-[#111111] border border-[#2a2a2a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <Bug size={14} className="text-[#c0392b]" />
            <span className="text-sm font-semibold text-[#e8e8e8] tracking-wide">Hata Bildir</span>
          </div>
          <button onClick={onClose} className="text-[#6b6b6b] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {success ? (
            <div className="text-center py-4">
              <p className="text-[#e8e8e8] text-sm mb-1">Teşekkürler!</p>
              <p className="text-[#6b6b6b] text-sm">Raporun alındı, inceleyip düzelteceğiz.</p>
              <button
                onClick={onClose}
                className="mt-5 px-6 py-2 bg-[#8b1a1a] text-white text-xs uppercase tracking-widest hover:bg-[#a82020] transition-colors"
              >
                Kapat
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.1em] text-[#6b6b6b] block mb-2">
                  Ne oldu?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Hatayı kısaca açıkla — ne yaptın, ne bekliyordun, ne gördün..."
                  className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-3 py-2.5 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#4a4a4a] resize-none"
                />
                <p className="text-[10px] text-[#4a4a4a] mt-1">{description.length} / 10 min</p>
              </div>

              {error && <p className="text-[#c0392b] text-xs">{error}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-[#2a2a2a] text-[#6b6b6b] text-xs uppercase tracking-widest hover:text-white hover:border-[#3a3a3a] transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-[#8b1a1a] text-white text-xs uppercase tracking-widest hover:bg-[#a82020] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
