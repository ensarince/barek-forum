'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface AdminActionProps {
  type: 'user' | 'topic'
  id: string
  currentStatus: string
}

export default function AdminAction({ type, id, currentStatus }: AdminActionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  async function deleteTopic() {
    setLoading('delete')
    setError(null)
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: id }),
      })
      if (!res.ok) throw new Error('İstek başarısız')
      router.refresh()
    } catch {
      setError('Hata oluştu')
    } finally {
      setLoading(null)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {currentStatus === 'pending' && (
        <>
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
        </>
      )}

      {type === 'topic' && (
        confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#6b6b6b]">Emin misin?</span>
            <button
              onClick={deleteTopic}
              disabled={loading !== null}
              className="px-2 py-1 text-xs bg-red-900/50 text-red-400 hover:bg-red-900/80 transition-colors disabled:opacity-40"
            >
              {loading === 'delete' ? '...' : 'Sil'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 text-xs text-[#6b6b6b] hover:text-white transition-colors"
            >
              İptal
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={loading !== null}
            title="Konuyu sil"
            className="text-[#4a4a4a] hover:text-red-400 transition-colors disabled:opacity-40 p-1"
          >
            <Trash2 size={14} />
          </button>
        )
      )}

      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  )
}
