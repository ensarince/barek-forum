'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Menu, Search, Settings, User, X } from 'lucide-react'
import logoSrc from '@/assets/barek-logo.png'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

interface TopbarProps {
  profile: Profile
  unreadCount: number
  onMenuClick?: () => void
}

export default function Topbar({ profile, unreadCount, onMenuClick }: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [bellCount, setBellCount] = useState(unreadCount)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close the user menu on outside tap/click or Escape
  useEffect(() => {
    if (!menuOpen) return
    function handlePointer(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`notif:${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => setBellCount((c) => c + 1)
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile.id])

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
    <header className="h-16 bg-[#111111] border-b border-[#2a2a2a] flex items-center justify-between px-4 shrink-0 z-10">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            aria-label="Menüyü aç"
            className="sm:hidden p-2.5 -m-2.5 text-[#8a8a8a] hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
        )}
      <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Ana sayfa">
        <Image src={logoSrc} alt="Barek" height={80} width={80} className="h-[60px] w-auto" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-[#8a8a8a] hidden sm:block">
          Bouldering Forum
        </span>
      </Link>
      </div>

      {/* Expandable search */}
      {searchOpen && (
        <form onSubmit={handleSearch} role="search" className="flex-1 min-w-0 mx-2 sm:mx-4 flex items-center gap-1">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') closeSearch() }}
            placeholder="Konu veya yanıt ara..."
            aria-label="Ara"
            className="flex-1 min-w-0 bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e8e8] px-3 py-1.5 text-base sm:text-sm focus:outline-none focus:border-[#e05a4a] placeholder-[#8a8a8a]"
          />
          <button type="submit" aria-label="Ara" className="p-2 text-[#8a8a8a] hover:text-white transition-colors">
            <Search size={16} />
          </button>
          <button type="button" onClick={closeSearch} aria-label="Aramayı kapat" className="p-2 text-[#8a8a8a] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </form>
      )}

      <div className="flex items-center gap-4">
        {/* Search */}
        {!searchOpen && (
          <button onClick={openSearch} aria-label="Ara" className="p-2.5 -m-2.5 text-[#8a8a8a] hover:text-white transition-colors">
            <Search size={18} />
          </button>
        )}

        {/* Notification bell */}
        <Link
          href="/notifications"
          onClick={() => setBellCount(0)}
          aria-label={bellCount > 0 ? `Bildirimler, ${bellCount} okunmamış` : 'Bildirimler'}
          className="relative p-2.5 -m-2.5 text-[#8a8a8a] hover:text-white transition-colors"
        >
          <Bell size={18} className={bellCount > 0 ? 'text-white' : ''} />
          {bellCount > 0 && (
            <span aria-hidden="true" className="absolute top-1 right-1 bg-[#8b1a1a] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
              {bellCount > 9 ? '9+' : bellCount}
            </span>
          )}
        </Link>

        {/* User menu — state-driven: Safari doesn't focus buttons on tap, so focus-within never opened it on iPhone */}
        <div ref={menuRef} className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Profil menüsü"
            className="flex items-center gap-2 p-1.5 -m-1.5 text-[#e8e8e8] hover:text-white transition-colors"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-7 h-7 object-cover border border-[#2a2a2a]"
              />
            ) : (
              <div className="w-7 h-7 bg-[#2a2a2a] flex items-center justify-center">
                <User size={14} className="text-[#8a8a8a]" />
              </div>
            )}
            <span className="text-sm font-medium hidden sm:block">{profile.username}</span>
          </button>

          {menuOpen && (
            <div role="menu" className="absolute right-0 top-10 w-48 bg-[#1e1e1e] border border-[#2a2a2a] z-50 shadow-xl">
              <Link
                href={`/profile/${profile.username}`}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-3 text-sm text-[#e8e8e8] hover:bg-[#2a2a2a] transition-colors"
              >
                <User size={14} />
                Profil
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-3 text-sm text-[#e8e8e8] hover:bg-[#2a2a2a] transition-colors"
              >
                <Settings size={14} />
                Ayarlar
              </Link>
              {profile.role === 'admin' && (
                <Link
                  href="/admin"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-3 text-sm text-[#e05a4a] hover:bg-[#2a2a2a] transition-colors border-t border-[#2a2a2a]"
                >
                  Admin Panel
                </Link>
              )}
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  role="menuitem"
                  className="w-full flex items-center gap-2 px-3 py-3 text-sm text-[#8a8a8a] hover:text-white hover:bg-[#2a2a2a] transition-colors border-t border-[#2a2a2a]"
                >
                  <LogOut size={14} />
                  Çıkış
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
