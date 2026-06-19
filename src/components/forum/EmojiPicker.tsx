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
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_KEYS[0])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 z-50 bg-[#1a1a1a] border border-[#2a2a2a] w-72 shadow-xl"
    >
      {/* Category tabs */}
      <div className="flex border-b border-[#2a2a2a]">
        {CATEGORY_KEYS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider transition-colors ${
              activeCategory === cat
                ? 'text-white border-b-2 border-[#8b1a1a]'
                : 'text-[#6b6b6b] hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 grid grid-cols-10 gap-0.5 max-h-40 overflow-y-auto">
        {CATEGORIES[activeCategory].map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => { onSelect(emoji); onClose() }}
            className="text-lg hover:bg-[#2a2a2a] rounded p-0.5 transition-colors leading-none"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
