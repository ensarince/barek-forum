'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import type { Profile, Sector } from '@/types/database'

const BANNERS = [
  '/bg/bg1.jpeg',
  '/bg/bg2.jpeg',
  '/bg/bg3.jpeg',
  '/bg/bg4.jpeg',
  '/bg/bg5.jpeg',
  '/bg/bg6.jpeg',
]

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
  const [activeIndex, setActiveIndex] = useState(bannerIndex)

  function prev() { setActiveIndex((i) => (i - 1 + BANNERS.length) % BANNERS.length) }
  function next() { setActiveIndex((i) => (i + 1) % BANNERS.length) }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="sticky top-0 z-40">
        <Topbar
          profile={profile}
          unreadCount={unreadCount}
          onMenuClick={() => setMenuOpen(true)}
        />
      </div>

      {/* Full-width banner with hover-reveal carousel controls */}
      <div className="group relative w-full overflow-hidden shrink-0 h-[12vh] sm:h-[20vh]">
        <Image
          src={BANNERS[activeIndex]}
          alt=""
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0d0d0d]" />

        {/* Prev button */}
        <button
          onClick={prev}
          aria-label="Önceki"
          className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 hover:bg-black/70 text-white rounded-full p-1"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Next button */}
        <button
          onClick={next}
          aria-label="Sonraki"
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 hover:bg-black/70 text-white rounded-full p-1"
        >
          <ChevronRight size={18} />
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              aria-label={`Görsel ${i + 1}`}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-1">
        <div className="hidden sm:flex shrink-0 sticky top-16 self-start h-[calc(100dvh-4rem)]">
          <Sidebar sectors={sectors} sectorCounts={sectorCounts} />
        </div>

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
