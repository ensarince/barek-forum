import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from '@/lib/utils'
import type { Notification, NotificationType } from '@/types/database'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

function notifLabel(type: NotificationType): string {
  switch (type) {
    case 'topic_approved': return 'Konun onaylandı'
    case 'topic_rejected': return 'Konun reddedildi'
    case 'user_approved': return 'Üyeliğin onaylandı'
    case 'reply_received': return 'Konuna yeni yanıt geldi'
    case 'announcement_posted': return 'Yeni duyuru yayınlandı'
  }
}

export default async function NotificationsPage() {
  if (!SUPABASE_CONFIGURED) {
    return <PreviewNotifications />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: notifsRaw } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const notifs = (notifsRaw ?? []) as Notification[]

  // Mark all as read
  const unreadIds = notifs.filter((n) => !n.is_read).map((n) => n.id)
  if (unreadIds.length > 0) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)
  }

  return <NotifList notifs={notifs} />
}

function NotifList({ notifs }: { notifs: Notification[] }) {
  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-6">Bildirimler</h2>

      <div className="divide-y divide-[#2a2a2a]">
        {notifs.map((n) => {
          const href = n.reference_id
            ? (n.type === 'reply_received' || n.type === 'topic_approved' || n.type === 'topic_rejected')
              ? `/topics/${n.reference_id}`
              : '/'
            : '/'

          return (
            <Link
              key={n.id}
              href={href}
              className="flex items-start gap-3 py-4 hover:bg-[#161616] -mx-4 px-4 transition-colors"
            >
              <div className="mt-1.5 shrink-0">
                <div className={`w-1.5 h-1.5 rounded-full ${!n.is_read ? 'bg-[#c0392b]' : 'bg-transparent'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.is_read ? 'font-semibold text-white' : 'text-[#c8c8c8]'}`}>
                  {notifLabel(n.type)}
                </p>
                <p className="text-[11px] text-[#6b6b6b] mt-0.5">{formatDistanceToNow(n.created_at)}</p>
              </div>
            </Link>
          )
        })}

        {notifs.length === 0 && (
          <p className="text-[#6b6b6b] text-sm py-8 text-center">Henüz bildirim yok.</p>
        )}
      </div>
    </div>
  )
}

function PreviewNotifications() {
  const items: Array<{ id: string; type: NotificationType; is_read: boolean; ago: string }> = [
    { id: '1', type: 'reply_received', is_read: false, ago: '5dk önce' },
    { id: '2', type: 'topic_approved', is_read: false, ago: '2s önce' },
    { id: '3', type: 'announcement_posted', is_read: true, ago: '1g önce' },
  ]
  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-6">Bildirimler</h2>
      <div className="divide-y divide-[#2a2a2a]">
        {items.map((n) => (
          <div key={n.id} className="flex items-start gap-3 py-4 hover:bg-[#161616] -mx-4 px-4 transition-colors cursor-pointer">
            <div className="mt-1.5 shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${!n.is_read ? 'bg-[#c0392b]' : 'bg-transparent'}`} />
            </div>
            <div className="flex-1">
              <p className={`text-sm ${!n.is_read ? 'font-semibold text-white' : 'text-[#c8c8c8]'}`}>
                {notifLabel(n.type)}
              </p>
              <p className="text-[11px] text-[#6b6b6b] mt-0.5">{n.ago}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
