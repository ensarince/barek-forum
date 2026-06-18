import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/forum/SettingsForm'
import type { Profile } from '@/types/database'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

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

export default async function SettingsPage() {
  if (!SUPABASE_CONFIGURED) {
    return <SettingsForm profile={PREVIEW_PROFILE} />
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
  if (!profile) redirect('/login')

  return <SettingsForm profile={profile} />
}
