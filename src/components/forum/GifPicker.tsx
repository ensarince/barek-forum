'use client'

import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'

interface GifItem {
  id: string
  title: string
  previewUrl: string
  url: string
}

interface GifPickerProps {
  onSelect: (gif: GifItem) => void
  onClose: () => void
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<GifItem[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useEffect(() => {
    // Load trending on open
    fetchGifs('')
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchGifs(query), 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  async function fetchGifs(q: string) {
    setLoading(true)
    try {
      const url = q ? `/api/giphy?q=${encodeURIComponent(q)}` : '/api/giphy'
      const res = await fetch(url)
      const data = await res.json() as { gifs: GifItem[] }
      setGifs(data.gifs ?? [])
    } catch {
      setGifs([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 z-50 bg-[#1a1a1a] border border-[#2a2a2a] w-80 shadow-xl"
    >
      {/* Search input */}
      <div className="p-2 border-b border-[#2a2a2a] flex items-center gap-2">
        <Search size={13} className="text-[#6b6b6b] shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="GIF ara..."
          autoFocus
          className="flex-1 bg-transparent text-sm text-[#e8e8e8] outline-none placeholder-[#6b6b6b]"
        />
      </div>

      {/* GIF grid */}
      <div className="p-1.5 grid grid-cols-3 gap-1 max-h-52 overflow-y-auto">
        {loading && (
          <div className="col-span-3 py-6 text-center text-[#6b6b6b] text-xs">Yükleniyor...</div>
        )}
        {!loading && gifs.length === 0 && (
          <div className="col-span-3 py-6 text-center text-[#6b6b6b] text-xs">Sonuç yok</div>
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

      {/* Giphy attribution (required) */}
      <div className="px-2 py-1 border-t border-[#2a2a2a] text-right">
        <span className="text-[9px] text-[#4a4a4a] uppercase tracking-wider">Powered by GIPHY</span>
      </div>
    </div>
  )
}
