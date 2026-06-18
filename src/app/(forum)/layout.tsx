import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
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

export default async function ForumLayout({ children }: { children: React.ReactNode }) {
  if (!SUPABASE_CONFIGURED) {
    return (
      <div className="flex flex-col h-screen">
        <Topbar profile={PREVIEW_PROFILE} unreadCount={3} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar sectors={PREVIEW_SECTORS} />
          <main className="flex-1 overflow-y-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null

  if (!profile || profile.status === 'pending') redirect('/pending')
  if (profile.status === 'rejected') redirect('/rejected')

  const { data: sectorsData } = await supabase
    .from('sectors')
    .select('*')
    .order('order_index')

  const sectors = (sectorsData ?? []) as Sector[]

  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <div className="flex flex-col h-screen">
      <Topbar profile={profile} unreadCount={unreadNotifications ?? 0} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar sectors={sectors} />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
