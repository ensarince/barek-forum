import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import { LayoutDashboard, Users, MessageSquare, Mountain, BookOpen, Megaphone, ArrowLeft } from 'lucide-react'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Üyeler', icon: Users },
  { href: '/admin/topics', label: 'Konular', icon: MessageSquare },
  { href: '/admin/sectors', label: 'Sektörler', icon: Mountain },
  { href: '/admin/rules', label: 'Kurallar', icon: BookOpen },
  { href: '/admin/announcements/new', label: 'Duyuru Yaz', icon: Megaphone },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const profile = data as Pick<Profile, 'role'> | null
    if (!profile || profile.role !== 'admin') redirect('/')
  }

  return (
    <div className="flex h-screen bg-[#0d0d0d]">
      {/* Admin sidebar */}
      <aside className="w-14 sm:w-48 bg-[#0a0a0a] border-r border-[#2a2a2a] flex flex-col shrink-0">
        <div className="h-12 flex items-center px-3 sm:px-4 border-b border-[#2a2a2a]">
          <span className="text-[#8b1a1a] font-black text-xs sm:text-sm tracking-[0.3em] uppercase">
            <span className="hidden sm:inline">ADMIN</span>
            <span className="sm:hidden">A</span>
          </span>
        </div>

        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-2 py-2 text-[#6b6b6b] hover:text-white hover:bg-[#1a1a1a] transition-colors group"
            >
              <Icon size={15} className="shrink-0 group-hover:text-[#c0392b]" />
              <span className="hidden sm:block text-sm">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t border-[#2a2a2a]">
          <Link
            href="/"
            className="flex items-center gap-3 px-2 py-2 text-[#6b6b6b] hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            <ArrowLeft size={15} className="shrink-0" />
            <span className="hidden sm:block text-sm">Forum</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
