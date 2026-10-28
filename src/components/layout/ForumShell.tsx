'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import { useDialog } from '@/lib/useDialog'
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
  const drawerRef = useDialog<HTMLDivElement>(menuOpen, () => setMenuOpen(false))
  const touchStartX = useRef<number | null>(null)

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

      {/* Full-width banner — hover reveals controls on desktop, swipe on touch */}
      <div
        className="group relative w-full overflow-hidden shrink-0 h-[12vh] sm:h-[20vh]"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return
          const dx = e.changedTouches[0].clientX - touchStartX.current
          touchStartX.current = null
          if (Math.abs(dx) > 40) { if (dx < 0) next(); else prev() }
        }}
      >
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
          aria-label="Önceki görsel"
          className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity bg-black/40 hover:bg-black/70 text-white rounded-full p-2 hidden sm:block"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Next button */}
        <button
          onClick={next}
          aria-label="Sonraki görsel"
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity bg-black/40 hover:bg-black/70 text-white rounded-full p-2 hidden sm:block"
        >
          <ChevronRight size={18} />
        </button>

        {/* Dot indicators — always visible on touch, padded hit area */}
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              aria-label={`Görsel ${i + 1}`}
              aria-current={i === activeIndex}
              className="p-1.5"
            >
              <span className={`block w-1.5 h-1.5 rounded-full transition-colors ${i === activeIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/70'}`} />
            </button>
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
              aria-hidden="true"
            />
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="drawer-title"
              className="absolute left-0 top-0 h-full w-64 max-w-[85vw] bg-[#111111] border-r border-[#2a2a2a] flex flex-col overflow-y-auto overscroll-contain"
            >
              <div className="flex items-center justify-between px-4 h-16 border-b border-[#2a2a2a] shrink-0">
                <span id="drawer-title" className="text-[10px] uppercase tracking-[0.2em] text-[#8a8a8a]">Menü</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Menüyü kapat"
                  className="p-2.5 -m-2.5 text-[#8a8a8a] hover:text-white transition-colors"
                >
                  <X size={18} />
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

        <main className="flex-1 bg-background min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
