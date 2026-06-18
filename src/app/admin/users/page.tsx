import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/admin/StatusBadge'
import AdminAction from '@/components/admin/AdminAction'
import { formatDistanceToNow } from '@/lib/utils'
import type { Profile } from '@/types/database'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

const PREVIEW_USERS: Profile[] = [
  { id: 'u1', username: 'taş_tırmanan', full_name: null, avatar_url: null, status: 'pending', role: 'user', eight_a_url: null, topo_url: null, instagram_url: null, youtube_url: null, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'u2', username: 'kaya_kemal', full_name: null, avatar_url: null, status: 'pending', role: 'user', eight_a_url: null, topo_url: null, instagram_url: null, youtube_url: null, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'u3', username: 'blok_ayse', full_name: null, avatar_url: null, status: 'pending', role: 'user', eight_a_url: null, topo_url: null, instagram_url: null, youtube_url: null, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'u4', username: 'murat_b', full_name: 'Murat Bulut', avatar_url: null, status: 'approved', role: 'user', eight_a_url: null, topo_url: null, instagram_url: null, youtube_url: null, created_at: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: 'u5', username: 'fatih_climb', full_name: null, avatar_url: null, status: 'approved', role: 'user', eight_a_url: null, topo_url: null, instagram_url: null, youtube_url: null, created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: 'u6', username: 'ayse_kaya', full_name: null, avatar_url: null, status: 'approved', role: 'user', eight_a_url: null, topo_url: null, instagram_url: null, youtube_url: null, created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: 'u7', username: 'kemal_tas', full_name: null, avatar_url: null, status: 'rejected', role: 'user', eight_a_url: null, topo_url: null, instagram_url: null, youtube_url: null, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
]

function UserRow({ user }: { user: Profile }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-[#161616] transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">{user.username}</p>
        {user.full_name && <p className="text-xs text-[#6b6b6b]">{user.full_name}</p>}
      </div>
      <p className="text-xs text-[#6b6b6b] hidden sm:block shrink-0">{formatDistanceToNow(user.created_at)}</p>
      <StatusBadge status={user.status} />
      <AdminAction type="user" id={user.id} currentStatus={user.status} />
    </div>
  )
}

function Section({ title, users }: { title: string; users: Profile[] }) {
  if (users.length === 0) return null
  return (
    <div className="mb-8">
      <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-3 px-4">{title} ({users.length})</h2>
      <div className="border border-[#2a2a2a] divide-y divide-[#2a2a2a]">
        {users.map((u) => <UserRow key={u.id} user={u} />)}
      </div>
    </div>
  )
}

export default async function AdminUsersPage() {
  let users: Profile[] = PREVIEW_USERS

  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient()
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    users = (data ?? []) as Profile[]
  }

  const pending = users.filter((u) => u.status === 'pending')
  const approved = users.filter((u) => u.status === 'approved')
  const rejected = users.filter((u) => u.status === 'rejected')

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xs uppercase tracking-[0.25em] text-[#6b6b6b] mb-6">Üyeler</h1>
      <Section title="Onay Bekleyenler" users={pending} />
      <Section title="Onaylananlar" users={approved} />
      <Section title="Reddedilenler" users={rejected} />
    </div>
  )
}
