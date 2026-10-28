'use client'

import { User } from 'lucide-react'

interface MentionUser {
  username: string
  avatar_url: string | null
}

interface MentionDropdownProps {
  users: MentionUser[]
  loading: boolean
  onSelect: (username: string) => void
  /** Highlighted row, driven by arrow keys in the textarea */
  activeIndex?: number
}

export default function MentionDropdown({ users, loading, onSelect, activeIndex = 0 }: MentionDropdownProps) {
  if (!loading && users.length === 0) return null

  return (
    <div
      id="mention-listbox"
      role="listbox"
      aria-label="Kullanıcı öner"
      className="absolute top-full left-0 mt-1 z-50 bg-[#1a1a1a] border border-[#2a2a2a] w-56 max-w-[calc(100vw-2rem)] shadow-xl max-h-48 overflow-y-auto"
    >
      {loading ? (
        <div className="px-3 py-2 text-xs text-[#8a8a8a]">Aranıyor...</div>
      ) : (
        users.map((u, i) => (
          <button
            key={u.username}
            id={`mention-option-${i}`}
            type="button"
            role="option"
            aria-selected={i === activeIndex}
            // preventDefault on mousedown keeps focus in the textarea
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(u.username)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 transition-colors text-left ${i === activeIndex ? 'bg-[#2a2a2a]' : 'hover:bg-[#2a2a2a]'}`}
          >
            {u.avatar_url ? (
              <img src={u.avatar_url} alt="" className="w-5 h-5 object-cover border border-[#2a2a2a] shrink-0" />
            ) : (
              <div className="w-5 h-5 bg-[#2a2a2a] flex items-center justify-center shrink-0">
                <User size={10} className="text-[#8a8a8a]" />
              </div>
            )}
            <span className="text-sm text-[#e8e8e8] truncate">{u.username}</span>
          </button>
        ))
      )}
    </div>
  )
}
