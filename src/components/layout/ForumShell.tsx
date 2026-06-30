'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import type { Profile, Sector } from '@/types/database'

interface ForumShellProps {
  profile: Profile
  unreadCount: number
  sectors: Sector[]
  sectorCounts: Record<string, number>
  bannerIndex: number
  children: React.ReactNode
}

export default function ForumShell({ profile, unreadCount, sectors, sectorCounts, bannerIndex, children }: ForumShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Topbar — sticks to top as page scrolls */}
      <div className="sticky top-0 z-40">
        <Topbar
          profile={profile}
          unreadCount={unreadCount}
          onMenuClick={() => setMenuOpen(true)}
        />
      </div>

      {/* Full-width banner — scrolls with page */}
      <div className="relative w-full overflow-hidden shrink-0 h-[12vh] sm:h-[20vh]">
        <Image
          src={`/bg/bg${bannerIndex + 1}.jpg`}
          alt=""
          fill
          className="object-cover object-center"
          priority
        />
        {/* Gradient fades banner into the dark background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0d0d0d]" />
      </div>

      {/* Sidebar + main — fill remaining page height */}
      <div className="flex flex-1">
        {/* Desktop sidebar — sticky below topbar (h-16 = 4rem) */}
        <div className="hidden sm:flex shrink-0 sticky top-16 self-start h-[calc(100dvh-4rem)]">
          <Sidebar sectors={sectors} sectorCounts={sectorCounts} />
        </div>

        {/* Mobile drawer overlay */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 sm:hidden">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-64 bg-[#111111] border-r border-[#2a2a2a] flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between px-4 h-16 border-b border-[#2a2a2a] shrink-0">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#6b6b6b]">Menü</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="text-[#6b6b6b] hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <Sidebar
                sectors={sectors}
                sectorCounts={sectorCounts}
                onLinkClick={() => setMenuOpen(false)}
              />
            </div>
          </div>
        )}

        <main className="flex-1 bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
