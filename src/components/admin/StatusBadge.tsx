import type { UserStatus, TopicStatus } from '@/types/database'

interface StatusBadgeProps {
  status: UserStatus | TopicStatus
}

const styles: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10',
  approved: 'text-emerald-400 bg-emerald-400/10',
  rejected: 'text-red-400 bg-red-400/10',
}

const labels: Record<string, string> = {
  pending: 'Bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold ${styles[status] ?? ''}`}>
      {labels[status] ?? status}
    </span>
  )
}
