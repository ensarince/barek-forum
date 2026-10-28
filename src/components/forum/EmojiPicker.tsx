'use client'

import { useEffect, useRef, useState } from 'react'

const CATEGORIES: Record<string, string[]> = {
  'Yüzler': ['😀','😂','🤣','😎','😍','🥵','😤','🤔','😱','🥴','😮','🤯','😅','😬','🫠','🫡','😴','🥳','🤩','🫶'],
  'Spor': ['🧗','🏃','🚵','🤸','🎯','🏆','🥇','🥈','🥉','🏅','💪','👊','🤜','🤞','✌️','🙌','👏','🤙','👍','👎'],
  'Doğa': ['⛰️','🏔️','🌄','🌅','🌊','🌿','🍃','🍂','☀️','🌤️','⛅','🌧️','⚡','❄️','🌬️','🔥','💧','🌈','🌙','⭐'],
  'Sembol': ['❤️','🔥','✨','💯','✅','❌','⚠️','💥','⭐','🌟','💫','🎉','🎊','🆙','🆒','💬','🔴','🟠','🟢','🔵'],
}

const CATEGORY_KEYS = Object.keys(CATEGORIES)

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  /** The toggle button — clicks on it are left to the button so it doesn't close and instantly reopen */
  toggleRef?: React.RefObject<HTMLElement | null>
}

export default function EmojiPicker({ onSelect, onClose, toggleRef }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_KEYS[0])
  const ref = useRef<HTMLDivElement>(null)

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

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Emoji seç"
      className="absolute bottom-full left-0 mb-2 z-50 bg-[#1a1a1a] border border-[#2a2a2a] w-[min(18rem,calc(100vw-2rem))] shadow-xl"
    >
      {/* Category tabs */}
      <div className="flex border-b border-[#2a2a2a]">
        {CATEGORY_KEYS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
            className={`flex-1 py-2.5 text-[10px] uppercase tracking-wider transition-colors ${
              activeCategory === cat
                ? 'text-white border-b-2 border-[#e05a4a]'
                : 'text-[#8a8a8a] hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-44 overflow-y-auto">
        {CATEGORIES[activeCategory].map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => { onSelect(emoji); onClose() }}
            aria-label={emoji}
            className="text-xl hover:bg-[#2a2a2a] rounded p-1 min-h-9 transition-colors leading-none"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
