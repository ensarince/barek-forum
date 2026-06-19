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
}

export default function MentionDropdown({ users, loading, onSelect }: MentionDropdownProps) {
  if (!loading && users.length === 0) return null

  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-[#1a1a1a] border border-[#2a2a2a] w-56 shadow-xl max-h-48 overflow-y-auto">
      {loading ? (
        <div className="px-3 py-2 text-xs text-[#6b6b6b]">Aranıyor...</div>
      ) : (
        users.map((u) => (
          <button
            key={u.username}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(u.username) }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#2a2a2a] transition-colors text-left"
          >
            {u.avatar_url ? (
              <img src={u.avatar_url} alt="" className="w-5 h-5 object-cover border border-[#2a2a2a] shrink-0" />
            ) : (
              <div className="w-5 h-5 bg-[#2a2a2a] flex items-center justify-center shrink-0">
                <User size={10} className="text-[#6b6b6b]" />
              </div>
            )}
            <span className="text-sm text-[#e8e8e8]">{u.username}</span>
          </button>
        ))
      )}
    </div>
  )
}
