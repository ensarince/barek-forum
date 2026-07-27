import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ForumShell from '@/components/layout/ForumShell'
import type { Profile, Sector } from '@/types/database'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

// Mock data for local preview without Supabase
const PREVIEW_PROFILE: Profile = {
  id: 'preview',
  username: 'preview_user',
  full_name: null,
  avatar_url: null,
  status: 'approved',
  role: 'admin',
  eight_a_url: null,
  topo_url: null,
  instagram_url: null,
  youtube_url: null,
  created_at: new Date().toISOString(),
}

const PREVIEW_SECTORS: Sector[] = [
  { id: '1', name: 'Ana Duvar', description: null, order_index: 0 },
  { id: '2', name: 'Mağara Sektörü', description: null, order_index: 1 },
  { id: '3', name: 'Sol Kanat', description: null, order_index: 2 },
  { id: '4', name: 'Sağ Kanat', description: null, order_index: 3 },
]

function ConnectionError() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#0d0d0d] px-4">
      <div className="text-center max-w-xs">
        <p className="text-[#e8e8e8] text-sm">Bağlantı kurulamadı.</p>
        <p className="text-[#6b6b6b] text-xs mt-2">Hesabında bir sorun yok — sunucuya ulaşılamadı.</p>
        {/* Plain anchor on purpose — a client-side <Link> to the route we are already
            on would not re-run this layout, and a full reload is the retry. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="inline-block mt-5 bg-[#8b1a1a] hover:bg-[#a82020] text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors"
        >
          Tekrar Dene
        </a>
      </div>
    </div>
  )
}

export default async function ForumLayout({ children }: { children: React.ReactNode }) {
  const bannerIndex = Math.floor(Date.now() / 86400000) % 6

  if (!SUPABASE_CONFIGURED) {
    return (
      <ForumShell
        profile={PREVIEW_PROFILE}
        unreadCount={3}
        sectors={PREVIEW_SECTORS}
        sectorCounts={{}}
        bannerIndex={bannerIndex}
      >
        {children}
      </ForumShell>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware already redirects unauthenticated users; this is a safety fallback
  if (!user) redirect('/login')

  // A dropped request looks exactly like a missing profile row, which would send
  // an approved member to /pending ("hesabın onay bekliyor") and read to them as a
  // failed login. Mobile connections drop these often enough to matter, so retry
  // once and show a retry screen rather than guessing at their status.
  let profileData = null
  let profileFailed = false
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!error) { profileData = data; profileFailed = false; break }
    profileFailed = error.code !== 'PGRST116' // PGRST116 = no row, genuinely absent
    if (!profileFailed) break
  }

  if (profileFailed) return <ConnectionError />

  const profile = profileData as Profile | null

  if (!profile || profile.status === 'pending') redirect('/pending')
  if (profile.status === 'rejected') redirect('/rejected')

  const { data: sectorsData } = await supabase
    .from('sectors')
    .select('*')
    .order('order_index')

  const sectors = (sectorsData ?? []) as Sector[]

  // Count approved topics per sector for sidebar display
  const { data: topicCountsData } = await supabase
    .from('topics')
    .select('sector_id')
    .eq('status', 'approved')
    .not('sector_id', 'is', null)

  const sectorCounts = ((topicCountsData ?? []) as { sector_id: string }[]).reduce<Record<string, number>>(
    (acc, t) => { acc[t.sector_id] = (acc[t.sector_id] ?? 0) + 1; return acc },
    {}
  )

  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <ForumShell
      profile={profile}
      unreadCount={unreadNotifications ?? 0}
      sectors={sectors}
      sectorCounts={sectorCounts}
      bannerIndex={bannerIndex}
    >
      {children}
    </ForumShell>
  )
}
