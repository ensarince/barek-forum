'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

interface GifItem {
  id: string
  title: string
  previewUrl: string
  url: string
}

interface GifPickerProps {
  onSelect: (gif: GifItem) => void
  onClose: () => void
  /** The toggle button — clicks on it are left to the button so it doesn't close and instantly reopen */
  toggleRef?: React.RefObject<HTMLElement | null>
}

export default function GifPicker({ onSelect, onClose, toggleRef }: GifPickerProps) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<GifItem[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestRef = useRef(0)

  // Click outside or Escape to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (toggleRef?.current?.contains(target)) return
      if (ref.current && !ref.current.contains(target)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, toggleRef])

  // Single effect: immediate fetch for trending (empty query), debounced for search
  useEffect(() => {
    async function fetchGifs(q: string) {
      // Drop responses from older searches that arrive late
      const requestId = ++requestRef.current
      setLoading(true)
      try {
        const url = q ? `/api/giphy?q=${encodeURIComponent(q)}` : '/api/giphy'
        const res = await fetch(url)
        const data = await res.json() as { gifs: GifItem[] }
        if (requestId === requestRef.current) setGifs(data.gifs ?? [])
      } catch {
        if (requestId === requestRef.current) setGifs([])
      } finally {
        if (requestId === requestRef.current) setLoading(false)
      }
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    const delay = query.trim() === '' ? 0 : 450
    debounceRef.current = setTimeout(() => fetchGifs(query.trim()), delay)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="GIF seç"
      className="absolute bottom-full left-0 mb-2 z-50 bg-[#1a1a1a] border border-[#2a2a2a] w-[min(20rem,calc(100vw-2rem))] shadow-xl"
    >
      {/* Search input */}
      <div className="p-2 border-b border-[#2a2a2a] flex items-center gap-2">
        <Search size={13} className="text-[#8a8a8a] shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="GIF ara..."
          aria-label="GIF ara"
          className="flex-1 min-w-0 bg-transparent text-base sm:text-sm text-[#e8e8e8] outline-none placeholder-[#8a8a8a]"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Aramayı temizle" className="p-1.5 text-[#8a8a8a] hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Trending label */}
      {!query && !loading && gifs.length > 0 && (
        <div className="px-2 pt-1.5 pb-0.5">
          <span className="text-[9px] uppercase tracking-widest text-[#8a8a8a]">Trend</span>
        </div>
      )}

      {/* GIF grid */}
      <div className="p-1.5 grid grid-cols-3 gap-1 max-h-52 overflow-y-auto">
        {loading && (
          <div className="col-span-3 py-6 text-center text-[#8a8a8a] text-xs">Yükleniyor...</div>
        )}
        {!loading && gifs.length === 0 && (
          <div className="col-span-3 py-6 text-center text-[#8a8a8a] text-xs">Sonuç yok</div>
        )}
        {!loading && gifs.map((gif) => (
          <button
            key={gif.id}
            type="button"
            onClick={() => { onSelect(gif); onClose() }}
            className="aspect-video overflow-hidden bg-[#0d0d0d] hover:ring-1 hover:ring-[#8b1a1a] transition-all"
          >
            {gif.previewUrl && (
              <img
                src={gif.previewUrl}
                alt={gif.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
          </button>
        ))}
      </div>

      {/* Giphy attribution (required by Giphy terms) */}
      <div className="px-2 py-1 border-t border-[#2a2a2a] text-right">
        <span className="text-[9px] text-[#8a8a8a] uppercase tracking-wider">Powered by GIPHY</span>
      </div>
    </div>
  )
}
