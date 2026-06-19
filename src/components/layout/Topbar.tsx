'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Search, Settings, User, X } from 'lucide-react'
import logoSrc from '@/assets/barek-logo.png'
import type { Profile } from '@/types/database'

interface TopbarProps {
  profile: Profile
  unreadCount: number
}

export default function Topbar({ profile, unreadCount }: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function openSearch() {
    setSearchOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function closeSearch() {
    setSearchOpen(false)
    setQuery('')
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    router.push(`/search?q=${encodeURIComponent(q)}`)
    closeSearch()
  }

  return (
    <header className="h-12 bg-[#111111] border-b border-[#2a2a2a] flex items-center justify-between px-4 shrink-0 z-10">
      <Link href="/" className="flex items-center gap-2.5 shrink-0">
        <Image src={logoSrc} alt="Barek" height={48} width={48} className="h-12 w-auto" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-[#6b6b6b] hidden sm:block">
          Bouldering Forum
        </span>
      </Link>

      {/* Expandable search */}
      {searchOpen && (
        <form onSubmit={handleSearch} className="flex-1 mx-4 flex items-center gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Konu veya yanıt ara..."
            className="flex-1 bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e8e8] px-3 py-1.5 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b]"
          />
          <button type="submit" className="text-[#6b6b6b] hover:text-white transition-colors">
            <Search size={16} />
          </button>
          <button type="button" onClick={closeSearch} className="text-[#6b6b6b] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </form>
      )}

      <div className="flex items-center gap-4">
        {/* Search */}
        {!searchOpen && (
          <button onClick={openSearch} className="text-[#6b6b6b] hover:text-white transition-colors">
            <Search size={18} />
          </button>
        )}

        {/* Notification bell */}
        <Link href="/notifications" className="relative text-[#6b6b6b] hover:text-white transition-colors">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#8b1a1a] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User menu */}
        <div className="flex items-center gap-2 group relative">
          <button className="flex items-center gap-2 text-[#e8e8e8] hover:text-white transition-colors">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-7 h-7 object-cover border border-[#2a2a2a]"
              />
            ) : (
              <div className="w-7 h-7 bg-[#2a2a2a] flex items-center justify-center">
                <User size={14} className="text-[#6b6b6b]" />
              </div>
            )}
            <span className="text-sm font-medium hidden sm:block">{profile.username}</span>
          </button>

          {/* Dropdown */}
          <div className="absolute right-0 top-8 w-44 bg-[#1e1e1e] border border-[#2a2a2a] hidden group-focus-within:block z-50">
            <Link
              href={`/profile/${profile.username}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#e8e8e8] hover:bg-[#2a2a2a] transition-colors"
            >
              <User size={14} />
              Profil
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#e8e8e8] hover:bg-[#2a2a2a] transition-colors"
            >
              <Settings size={14} />
              Ayarlar
            </Link>
            {profile.role === 'admin' && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-3 py-2 text-sm text-[#8b1a1a] hover:bg-[#2a2a2a] transition-colors border-t border-[#2a2a2a]"
              >
                Admin Panel
              </Link>
            )}
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#6b6b6b] hover:text-white hover:bg-[#2a2a2a] transition-colors border-t border-[#2a2a2a]"
              >
                <LogOut size={14} />
                Çıkış
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  )
}
