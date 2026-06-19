'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Megaphone } from 'lucide-react'
import type { Sector } from '@/types/database'

interface SidebarProps {
  sectors: Sector[]
  sectorCounts?: Record<string, number>
}

export default function Sidebar({ sectors, sectorCounts = {} }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="w-56 bg-[#111111] border-r border-[#2a2a2a] flex flex-col shrink-0 overflow-y-auto">
      {/* Static links */}
      <nav className="p-3 space-y-0.5">
        <SidebarLink
          href="/rules"
          icon={<BookOpen size={14} />}
          label="Kurallar"
          active={isActive('/rules')}
        />
        <SidebarLink
          href="/announcements"
          icon={<Megaphone size={14} />}
          label="Duyurular"
          active={isActive('/announcements')}
        />
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-[#2a2a2a]" />

      {/* Sectors */}
      <div className="p-3">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#6b6b6b] mb-2 px-2">
          Sektörler
        </p>
        <nav className="space-y-0.5">
          {sectors.map((sector) => (
            <SidebarLink
              key={sector.id}
              href={`/sectors/${sector.id}`}
              label={sector.name}
              count={sectorCounts[sector.id]}
              active={isActive(`/sectors/${sector.id}`)}
            />
          ))}
        </nav>
      </div>
    </aside>
  )
}

function SidebarLink({
  href,
  icon,
  label,
  count,
  active,
}: {
  href: string
  icon?: React.ReactNode
  label: string
  count?: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-2 py-1.5 text-sm transition-colors ${
        active
          ? 'text-white bg-[#1e1e1e] border-l-2 border-[#8b1a1a]'
          : 'text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a] border-l-2 border-transparent'
      }`}
    >
      {icon && <span className={active ? 'text-[#c0392b]' : 'text-[#6b6b6b]'}>{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-[#4a4a4a] shrink-0">{count}</span>
      )}
    </Link>
  )
}
