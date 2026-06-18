'use client'

import { useState, useEffect } from 'react'

const PREVIEW_CONTENT = `## Barek Bouldering Kuralları

### Genel Kurallar

- Alana araçla giriş yasaktır. Yürüyerek ulaşın.
- Doğal bitki örtüsüne zarar vermeyin.
- Çöpünüzü yanınızda götürün.
- Ateş yakmayın.

### Tırmanış Kuralları

- Magnezyum kullanımında doğal taşa zarar vermemeye özen gösterin.
- Islak taşa tırmanmayın.
- Yeni güzergahları açmadan önce yerel toplulukla iletişime geçin.
- Diğer tırmanıcılara saygılı olun.

### İletişim

Sorularınız için forum üzerinden admin ile iletişime geçebilirsiniz.`

export default function AdminRulesPage() {
  const [content, setContent] = useState(PREVIEW_CONTENT)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/rules')
      .then((r) => r.json())
      .then((data: { content?: string }) => { if (data.content) setContent(data.content) })
      .catch(() => {})
  }, [])

  async function save() {
    setLoading(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/admin/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Kayıt başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xs uppercase tracking-[0.25em] text-[#6b6b6b]">Kurallar</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-emerald-400 uppercase tracking-widest">Kaydedildi</span>}
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button
            onClick={save}
            disabled={loading}
            className="px-4 py-2 bg-[#8b1a1a] hover:bg-[#a82020] text-white text-xs uppercase tracking-widest transition-colors disabled:opacity-40"
          >
            {loading ? '...' : 'Kaydet'}
          </button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={25}
        className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#8b1a1a] resize-y leading-relaxed"
        placeholder="Kuralları buraya girin (Markdown desteklenir)"
      />
      <p className="text-xs text-[#6b6b6b] mt-2">Markdown desteklenir: ## başlık, - liste, **kalın**</p>
    </div>
  )
}
