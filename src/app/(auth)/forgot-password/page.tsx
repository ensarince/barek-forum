'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import logoSrc from '@/assets/barek-logo.png'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/api/auth/callback?next=/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo })
      if (error) {
        setError('Bir hata oluştu. Email adresini kontrol et.')
      } else {
        setSent(true)
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

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-[#e8e8e8] text-sm leading-relaxed">
              Eğer bu email sistemde kayıtlıysa sıfırlama bağlantısı gönderildi.<br />
              Gelen kutunu ve spam klasörünü kontrol et.
            </p>
            <Link href="/login" className="block text-[#6b6b6b] text-sm hover:text-white transition-colors">
              ← Giriş sayfasına dön
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[#6b6b6b] text-sm mb-6 text-center">
              Email adresini gir, sıfırlama bağlantısı gönderelim.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
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
                {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
              </button>
            </form>

            <p className="text-center text-[#6b6b6b] text-sm mt-6">
              <Link href="/login" className="hover:text-white transition-colors">
                ← Giriş sayfasına dön
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
