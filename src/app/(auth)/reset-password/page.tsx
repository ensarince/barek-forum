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

  useEffect(() => {
    const supabase = createClient()

    // Implicit flow: Supabase delivers tokens as hash fragment
    // (#access_token=...&refresh_token=...&type=recovery)
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const type = hashParams.get('type')

    if (accessToken && refreshToken && type === 'recovery') {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            setError('Bu bağlantı geçersiz veya süresi dolmuş. Yeni bir sıfırlama bağlantısı talep et.')
          } else {
            window.history.replaceState(null, '', window.location.pathname)
            setReady(true)
          }
        })
    } else {
      // PKCE flow: session already set by callback route
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setReady(true)
        } else {
          setError('Bu bağlantı geçersiz veya süresi dolmuş. Yeni bir sıfırlama bağlantısı talep et.')
        }
      })
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalı.')
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
    <div className="min-h-screen min-h-dvh flex items-center justify-center bg-[#0d0d0d] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Image src={logoSrc} alt="Barek" height={192} width={192} className="h-48 w-auto mx-auto" />
          <p className="text-[#8a8a8a] text-sm mt-3 tracking-wider uppercase">Bouldering Forum</p>
        </div>

        {!ready && !error && (
          <p className="text-center text-[#8a8a8a] text-sm">Doğrulanıyor...</p>
        )}

        {error && !ready && (
          <div className="text-center space-y-4">
            <p className="text-[#e05a4a] text-sm">{error}</p>
            <Link href="/forgot-password" className="block text-[#8a8a8a] text-sm hover:text-white transition-colors">
              Yeni bağlantı talep et →
            </Link>
          </div>
        )}

        {ready && (
          <>
            <p className="text-[#8a8a8a] text-sm mb-6 text-center">Yeni şifreni belirle.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Yeni şifre"
                  aria-label="Yeni şifre"
                  autoComplete="new-password"
                  required
                  className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-[#e05a4a] placeholder-[#8a8a8a]"
                />
              </div>
              <div>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Şifreyi tekrarla"
                  aria-label="Şifreyi tekrarla"
                  autoComplete="new-password"
                  required
                  className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-[#e05a4a] placeholder-[#8a8a8a]"
                />
              </div>

              {error && <p role="alert" className="text-[#e05a4a] text-sm">{error}</p>}

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
