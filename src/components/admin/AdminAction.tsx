'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AdminActionProps {
  type: 'user' | 'topic'
  id: string
  currentStatus: string
}

export default function AdminAction({ type, id, currentStatus }: AdminActionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (currentStatus !== 'pending') return null

  const endpoint = type === 'user' ? '/api/admin/users' : '/api/admin/topics'
  const body = type === 'user' ? { userId: id } : { topicId: id }

  async function act(action: 'approve' | 'reject') {
    setLoading(action)
    setError(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, action }),
      })
      if (!res.ok) throw new Error('İstek başarısız')
      router.refresh()
    } catch {
      setError('Hata oluştu')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => act('approve')}
        disabled={loading !== null}
        className="px-3 py-1 text-xs uppercase tracking-widest bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/70 transition-colors disabled:opacity-40"
      >
        {loading === 'approve' ? '...' : 'Onayla'}
      </button>
      <button
        onClick={() => act('reject')}
        disabled={loading !== null}
        className="px-3 py-1 text-xs uppercase tracking-widest bg-red-900/30 text-red-400 hover:bg-red-900/60 transition-colors disabled:opacity-40"
      >
        {loading === 'reject' ? '...' : 'Reddet'}
      </button>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  )
}
