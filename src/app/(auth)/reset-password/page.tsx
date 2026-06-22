'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import logoSrc from '@/assets/barek-logo.png'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // The callback route exchanges the PKCE code for a session before landing here.
  // We just verify there is an active session before showing the form.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
      } else {
        // No session — link expired or already used
        setError('Bu bağlantı geçersiz veya süresi dolmuş. Yeni bir sıfırlama bağlantısı talep et.')
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.')
      return
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError('Şifre güncellenemedi. Lütfen tekrar dene.')
      } else {
        await supabase.auth.signOut()
        router.push('/login?reset=1')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Image src={logoSrc} alt="Barek" height={192} width={192} className="h-48 w-auto mx-auto" />
          <p className="text-[#6b6b6b] text-sm mt-3 tracking-wider uppercase">Bouldering Forum</p>
        </div>

        {!ready && !error && (
          <p className="text-center text-[#6b6b6b] text-sm">Doğrulanıyor...</p>
        )}

        {error && !ready && (
          <div className="text-center space-y-4">
            <p className="text-[#c0392b] text-sm">{error}</p>
            <Link href="/forgot-password" className="block text-[#6b6b6b] text-sm hover:text-white transition-colors">
              Yeni bağlantı talep et →
            </Link>
          </div>
        )}

        {ready && (
          <>
            <p className="text-[#6b6b6b] text-sm mb-6 text-center">Yeni şifreni belirle.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Yeni şifre"
                  required
                  className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b]"
                />
              </div>
              <div>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Şifreyi tekrarla"
                  required
                  className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b]"
                />
              </div>

              {error && <p className="text-[#c0392b] text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#8b1a1a] hover:bg-[#a82020] text-white py-3 text-sm font-semibold uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {loading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
