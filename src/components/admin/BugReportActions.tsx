'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, RotateCcw } from 'lucide-react'

export default function BugReportActions({ id, status }: { id: string; status: string }) {
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const router = useRouter()

  async function toggle() {
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch('/api/bug-report', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: status === 'open' ? 'resolved' : 'open' }),
      })
      if (!res.ok) setFailed(true)
      router.refresh()
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  const label = status === 'open' ? 'Çözüldü olarak işaretle' : 'Tekrar aç'

  return (
    <div className="shrink-0 flex flex-col items-end">
      <button
        onClick={toggle}
        disabled={loading}
        title={label}
        aria-label={label}
        className="p-2 -m-2 text-[#8a8a8a] hover:text-white transition-colors disabled:opacity-30 mt-0.5"
      >
        {status === 'open' ? <CheckCircle size={16} /> : <RotateCcw size={16} />}
      </button>
      {failed && <span role="alert" className="text-[10px] text-[#e05a4a] mt-1">Hata</span>}
    </div>
  )
}
