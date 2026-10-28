'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import logoSrc from '@/assets/barek-logo.png'

const schema = z.object({
  email: z.string().email('Geçerli bir email girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
})

type FormData = z.infer<typeof schema>

// Isolated to its own Suspense so the form itself is never deferred
function PasswordResetBanner() {
  const searchParams = useSearchParams()
  if (searchParams.get('reset') !== '1') return null
  return <p className="text-center text-sm text-green-400 mb-4">Şifren güncellendi. Giriş yapabilirsin.</p>
}

function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Supabase implicit-flow recovery: tokens land at /login#access_token=...&type=recovery
  // Redirect immediately to /reset-password so it can pick them up
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    if (params.get('type') === 'recovery' && params.get('access_token')) {
      window.location.replace(`/reset-password${window.location.hash}`)
    }
  }, [])

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError(null)
    try {
      // credentials must be explicit: some iOS Safari versions silently drop the
      // Set-Cookie header from a same-origin fetch() response unless this is set,
      // even though the fetch spec default is already 'same-origin'.
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) {
        setError(json.error ?? 'Email veya şifre hatalı.')
        return
      }
      // Back to where the proxy sent them from — same-site paths only
      const next = new URLSearchParams(window.location.search).get('next') ?? '/'
      const target = next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/'
      // Hard navigation so the browser sends the server-set session cookie.
      // Not a React state mutation, so the compiler's rule doesn't apply here.
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = target
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar dene.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Suspense>
        <PasswordResetBanner />
      </Suspense>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="sr-only">Email</label>
          <input
            {...register('email')}
            id="login-email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            autoCapitalize="none"
            aria-invalid={!!errors.email}
            className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-[#e05a4a] placeholder-[#8a8a8a]"
          />
          {errors.email && <p role="alert" className="text-[#e05a4a] text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="login-password" className="sr-only">Şifre</label>
          <input
            {...register('password')}
            id="login-password"
            type="password"
            placeholder="Şifre"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-[#e05a4a] placeholder-[#8a8a8a]"
          />
          {errors.password && <p role="alert" className="text-[#e05a4a] text-xs mt-1">{errors.password.message}</p>}
        </div>

        {error && <p role="alert" className="text-[#e05a4a] text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#8b1a1a] hover:bg-[#a82020] text-white py-3 text-sm font-semibold uppercase tracking-widest transition-colors disabled:opacity-50"
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>

      <div className="flex items-center justify-between mt-6 text-sm text-[#8a8a8a]">
        <Link href="/forgot-password" className="py-2 hover:text-white transition-colors">
          Şifremi unuttum
        </Link>
        <span>
          Hesabın yok mu?{' '}
          <Link href="/signup" className="py-2 text-[#e05a4a] hover:text-white transition-colors">
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
          <h1><Image src={logoSrc} alt="Barek" height={192} width={192} className="h-48 w-auto mx-auto" /></h1>
          <p className="text-[#8a8a8a] text-sm mt-3 tracking-wider uppercase">Bouldering Forum</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
