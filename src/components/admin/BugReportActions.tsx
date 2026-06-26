'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, RotateCcw } from 'lucide-react'

export default function BugReportActions({ id, status }: { id: string; status: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggle() {
    setLoading(true)
    try {
      await fetch('/api/bug-report', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: status === 'open' ? 'resolved' : 'open' }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={status === 'open' ? 'Çözüldü olarak işaretle' : 'Tekrar aç'}
      className="shrink-0 text-[#4a4a4a] hover:text-white transition-colors disabled:opacity-30 mt-0.5"
    >
      {status === 'open' ? <CheckCircle size={16} /> : <RotateCcw size={16} />}
    </button>
  )
}
