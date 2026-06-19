import { createClient } from '@/lib/supabase/server'
import NewTopicForm from '@/components/forum/NewTopicForm'
import type { Sector, Profile } from '@/types/database'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

const PREVIEW_SECTORS: Sector[] = [
  { id: '1', name: 'Ana Duvar', description: null, order_index: 0 },
  { id: '2', name: 'Mağara Sektörü', description: null, order_index: 1 },
  { id: '3', name: 'Sol Kanat', description: null, order_index: 2 },
  { id: '4', name: 'Sağ Kanat', description: null, order_index: 3 },
]

export default async function NewTopicPage() {
  if (!SUPABASE_CONFIGURED) {
    return <NewTopicForm sectors={PREVIEW_SECTORS} isAdmin={false} />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: sectorsData }, { data: profileData }] = await Promise.all([
    supabase.from('sectors').select('*').order('order_index'),
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
  ])

  const sectors = (sectorsData ?? []) as Sector[]
  const isAdmin = (profileData as Pick<Profile, 'role'> | null)?.role === 'admin'

  return <NewTopicForm sectors={sectors} isAdmin={isAdmin} />
}
