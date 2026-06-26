import { createServiceClient } from '@/lib/supabase/server'
import BugReportActions from '@/components/admin/BugReportActions'

type BugReport = {
  id: string
  description: string
  page_url: string | null
  status: string
  created_at: string
  reporter: { username: string }[] | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function BugReportsPage() {
  const service = createServiceClient()
  const { data } = await service
    .from('bug_reports')
    .select('id, description, page_url, status, created_at, reporter:profiles(username)')
    .order('created_at', { ascending: false })

  const reports = (data ?? []) as BugReport[]
  const open = reports.filter((r) => r.status === 'open')
  const resolved = reports.filter((r) => r.status !== 'open')

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xs uppercase tracking-[0.25em] text-[#6b6b6b] mb-6">
        Hata Raporları
        {open.length > 0 && (
          <span className="ml-2 text-[#c0392b]">({open.length} açık)</span>
        )}
      </h1>

      {reports.length === 0 ? (
        <p className="text-[#6b6b6b] text-sm">Henüz hata raporu yok.</p>
      ) : (
        <div className="space-y-2">
          {[...open, ...resolved].map((report) => (
            <div
              key={report.id}
              className={`bg-[#111111] border p-4 transition-opacity ${
                report.status === 'open'
                  ? 'border-[#2a2a2a] border-l-2 border-l-[#8b1a1a]'
                  : 'border-[#1a1a1a] opacity-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-medium text-[#a0a0a0]">
                      {report.reporter?.[0]?.username ?? 'bilinmiyor'}
                    </span>
                    <span className="text-[10px] text-[#4a4a4a]">{formatDate(report.created_at)}</span>
                    {report.status === 'resolved' && (
                      <span className="text-[10px] text-green-700 uppercase tracking-wider">çözüldü</span>
                    )}
                  </div>
                  <p className="text-sm text-[#e8e8e8] whitespace-pre-wrap break-words leading-relaxed">
                    {report.description}
                  </p>
                  {report.page_url && (
                    <p className="text-[11px] text-[#3a3a3a] mt-2 truncate font-mono" title={report.page_url}>
                      {report.page_url}
                    </p>
                  )}
                </div>
                <BugReportActions id={report.id} status={report.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
