'use client'

import { useState, useEffect } from 'react'
import type { Sector } from '@/types/database'

const PREVIEW_SECTORS: Sector[] = [
  { id: '1', name: 'Ana Duvar', description: 'Ana kaya yüzeyi', order_index: 0 },
  { id: '2', name: 'Mağara Sektörü', description: 'Overhang alanı', order_index: 1 },
  { id: '3', name: 'Sol Kanat', description: null, order_index: 2 },
  { id: '4', name: 'Sağ Kanat', description: null, order_index: 3 },
]

const SUPABASE_CONFIGURED =
  typeof window !== 'undefined'
    ? false
    : false

export default function AdminSectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>(PREVIEW_SECTORS)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/sectors')
      .then((r) => r.json())
      .then((data: Sector[]) => { if (Array.isArray(data)) setSectors(data) })
      .catch(() => {})
  }, [])

  async function startEdit(s: Sector) {
    setEditId(s.id)
    setEditName(s.name)
    setEditDesc(s.description ?? '')
  }

  async function saveEdit() {
    if (!editId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/sectors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, name: editName, description: editDesc || null }),
      })
      if (!res.ok) throw new Error()
      setSectors((prev) => prev.map((s) => s.id === editId ? { ...s, name: editName, description: editDesc || null } : s))
      setEditId(null)
    } catch {
      setError('Kayıt başarısız')
    } finally {
      setLoading(false)
    }
  }

  async function deleteSector(id: string) {
    if (!confirm('Bu sektörü silmek istediğinden emin misin?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/sectors?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setSectors((prev) => prev.filter((s) => s.id !== id))
    } catch {
      setError('Silme başarısız')
    } finally {
      setLoading(false)
    }
  }

  async function addSector() {
    if (!newName.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/sectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json() as Sector
      setSectors((prev) => [...prev, created])
      setNewName('')
      setNewDesc('')
    } catch {
      setError('Ekleme başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xs uppercase tracking-[0.25em] text-[#6b6b6b] mb-6">Sektörler</h1>

      <div className="border border-[#2a2a2a] divide-y divide-[#2a2a2a] mb-8">
        {sectors.map((s) => (
          <div key={s.id} className="px-4 py-3 hover:bg-[#161616] transition-colors">
            {editId === s.id ? (
              <div className="space-y-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-[#e8e8e8] px-3 py-2 text-sm focus:outline-none focus:border-[#8b1a1a]"
                />
                <input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Açıklama (isteğe bağlı)"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-[#e8e8e8] px-3 py-2 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b]"
                />
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={loading} className="px-3 py-1.5 bg-[#8b1a1a] hover:bg-[#a82020] text-white text-xs uppercase tracking-widest transition-colors disabled:opacity-40">
                    Kaydet
                  </button>
                  <button onClick={() => setEditId(null)} className="px-3 py-1.5 bg-[#1e1e1e] text-[#6b6b6b] hover:text-white text-xs uppercase tracking-widest transition-colors">
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-white">{s.name}</p>
                  {s.description && <p className="text-xs text-[#6b6b6b] mt-0.5">{s.description}</p>}
                </div>
                <span className="text-xs text-[#6b6b6b]">#{s.order_index + 1}</span>
                <button onClick={() => startEdit(s)} className="text-xs text-[#6b6b6b] hover:text-white transition-colors">
                  Düzenle
                </button>
                <button onClick={() => deleteSector(s.id)} className="text-xs text-red-500 hover:text-red-400 transition-colors">
                  Sil
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border border-[#2a2a2a] p-4">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-3">Yeni Sektör Ekle</h2>
        <div className="space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Sektör adı"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-[#e8e8e8] px-3 py-2 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b]"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Açıklama (isteğe bağlı)"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] text-[#e8e8e8] px-3 py-2 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b]"
          />
          <button
            onClick={addSector}
            disabled={loading || !newName.trim()}
            className="px-4 py-2 bg-[#8b1a1a] hover:bg-[#a82020] text-white text-xs uppercase tracking-widest transition-colors disabled:opacity-40"
          >
            {loading ? '...' : '+ Ekle'}
          </button>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      </div>
    </div>
  )
}
