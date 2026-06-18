'use client'

import Link from 'next/link'
import { Bell, LogOut, Settings, User } from 'lucide-react'
import type { Profile } from '@/types/database'

interface TopbarProps {
  profile: Profile
  unreadCount: number
}

export default function Topbar({ profile, unreadCount }: TopbarProps) {
  return (
    <header className="h-12 bg-[#111111] border-b border-[#2a2a2a] flex items-center justify-between px-4 shrink-0 z-10">
      <Link href="/" className="flex items-center gap-3">
        <span className="text-lg font-black tracking-[0.3em] uppercase text-white">BAREK</span>
        <span className="text-[10px] tracking-[0.2em] uppercase text-[#6b6b6b] hidden sm:block">
          Bouldering Forum
        </span>
      </Link>

      <div className="flex items-center gap-4">
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
