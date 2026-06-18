import { createClient } from '@/lib/supabase/server'
import NewTopicForm from '@/components/forum/NewTopicForm'
import type { Sector } from '@/types/database'

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
    return <NewTopicForm sectors={PREVIEW_SECTORS} />
  }

  const supabase = await createClient()
  const { data } = await supabase.from('sectors').select('*').order('order_index')
  const sectors = (data ?? []) as Sector[]

  return <NewTopicForm sectors={sectors} />
}
