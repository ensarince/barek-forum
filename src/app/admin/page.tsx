import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

interface StatCard {
  label: string
  value: number
  href: string
  highlight?: boolean
}

function StatCardUI({ label, value, href, highlight }: StatCard) {
  return (
    <Link
      href={href}
      className="block bg-[#161616] border border-[#2a2a2a] border-l-2 border-l-[#8b1a1a] p-5 hover:bg-[#1a1a1a] transition-colors"
    >
      <p className={`text-4xl font-black mb-1 ${highlight && value > 0 ? 'text-[#c0392b]' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-xs uppercase tracking-[0.15em] text-[#6b6b6b]">{label}</p>
    </Link>
  )
}

export default async function AdminDashboard() {
  let stats = { pendingUsers: 3, pendingTopics: 2, totalUsers: 47, totalTopics: 134 }

  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient()

    const [
      { count: pendingUsers },
      { count: pendingTopics },
      { count: totalUsers },
      { count: totalTopics },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('topics').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('topics').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    ])

    stats = {
      pendingUsers: pendingUsers ?? 0,
      pendingTopics: pendingTopics ?? 0,
      totalUsers: totalUsers ?? 0,
      totalTopics: totalTopics ?? 0,
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xs uppercase tracking-[0.25em] text-[#6b6b6b] mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCardUI label="Onay Bekleyen Üyeler" value={stats.pendingUsers} href="/admin/users" highlight />
        <StatCardUI label="Onay Bekleyen Konular" value={stats.pendingTopics} href="/admin/topics" highlight />
        <StatCardUI label="Toplam Üye" value={stats.totalUsers} href="/admin/users" />
        <StatCardUI label="Toplam Konu" value={stats.totalTopics} href="/admin/topics" />
      </div>
    </div>
  )
}
