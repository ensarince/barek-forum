'use client'

import { Suspense, useActionState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logoSrc from '@/assets/barek-logo.png'
import { loginAction } from './actions'

function PasswordResetBanner() {
  const searchParams = useSearchParams()
  if (searchParams.get('reset') !== '1') return null
  return <p className="text-center text-sm text-green-400 mb-4">Şifren güncellendi. Giriş yapabilirsin.</p>
}

function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null)

  // Supabase implicit-flow recovery: tokens land at /login#access_token=...&type=recovery
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    if (params.get('type') === 'recovery' && params.get('access_token')) {
      window.location.replace(`/reset-password${window.location.hash}`)
    }
  }, [])

  const inputCls = 'w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b]'

  return (
    <>
      <Suspense>
        <PasswordResetBanner />
      </Suspense>

      <form action={formAction} className="space-y-4">
        <div>
          <input
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            className={inputCls}
          />
        </div>

        <div>
          <input
            name="password"
            type="password"
            placeholder="Şifre"
            autoComplete="current-password"
            required
            className={inputCls}
          />
        </div>

        {state?.error && <p className="text-[#c0392b] text-sm">{state.error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#8b1a1a] hover:bg-[#a82020] text-white py-3 text-sm font-semibold uppercase tracking-widest transition-colors disabled:opacity-50"
        >
          {isPending ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>

      <div className="flex items-center justify-between mt-6 text-sm text-[#6b6b6b]">
        <Link href="/forgot-password" className="hover:text-white transition-colors">
          Şifremi unuttum
        </Link>
        <span>
          Hesabın yok mu?{' '}
          <Link href="/signup" className="text-[#c0392b] hover:text-white transition-colors">
            Kayıt ol
          </Link>
        </span>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center bg-[#0d0d0d] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Image src={logoSrc} alt="Barek" height={192} width={192} className="h-48 w-auto mx-auto" />
          <p className="text-[#6b6b6b] text-sm mt-3 tracking-wider uppercase">Bouldering Forum</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
