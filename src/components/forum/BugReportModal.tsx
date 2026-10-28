'use client'

import { useState } from 'react'
import { X, Bug } from 'lucide-react'
import { useDialog } from '@/lib/useDialog'

interface Props {
  isOpen: boolean
  onClose: () => void
}

// The panel mounts fresh on every open, so its form state starts clean each time
export default function BugReportModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null
  return <BugReportPanel onClose={onClose} />
}

function BugReportPanel({ onClose }: { onClose: () => void }) {
  const [description, setDescription] = useState('')
  const [pageUrl] = useState(() => window.location.href)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useDialog<HTMLDivElement>(true, onClose)

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
      const json = await res.json().catch(() => ({})) as { error?: string }
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
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-report-title"
        className="relative w-full sm:max-w-md bg-[#111111] border border-[#2a2a2a] shadow-2xl pb-[env(safe-area-inset-bottom)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <Bug size={14} className="text-[#e05a4a]" aria-hidden="true" />
            <h2 id="bug-report-title" className="text-sm font-semibold text-[#e8e8e8] tracking-wide">Hata Bildir</h2>
          </div>
          <button onClick={onClose} aria-label="Kapat" className="p-2.5 -m-2.5 text-[#8a8a8a] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {success ? (
            <div className="text-center py-4" role="status">
              <p className="text-[#e8e8e8] text-sm mb-1">Teşekkürler!</p>
              <p className="text-[#8a8a8a] text-sm">Raporun alındı, inceleyip düzelteceğiz.</p>
              <button
                onClick={onClose}
                className="mt-5 px-6 py-2.5 bg-[#8b1a1a] text-white text-xs uppercase tracking-widest hover:bg-[#a82020] transition-colors"
              >
                Kapat
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="bug-description" className="text-xs uppercase tracking-[0.1em] text-[#8a8a8a] block mb-2">
                  Ne oldu?
                </label>
                <textarea
                  id="bug-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={5000}
                  placeholder="Hatayı kısaca açıkla — ne yaptın, ne bekliyordun, ne gördün..."
                  className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-[#e05a4a] placeholder-[#8a8a8a] resize-none"
                />
                {description.length < 10 && (
                  <p className="text-[11px] text-[#8a8a8a] mt-1">{description.length} / 10 karakter</p>
                )}
              </div>

              {error && <p role="alert" className="text-[#e05a4a] text-xs">{error}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-[#2a2a2a] text-[#8a8a8a] text-xs uppercase tracking-widest hover:text-white hover:border-[#8a8a8a] transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-[#8b1a1a] text-white text-xs uppercase tracking-widest hover:bg-[#a82020] transition-colors disabled:opacity-50"
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
