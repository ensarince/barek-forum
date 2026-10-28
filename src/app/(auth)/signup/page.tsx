'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import logoSrc from '@/assets/barek-logo.png'

const schema = z.object({
  username: z
    .string()
    .min(3, 'En az 3 karakter')
    .max(30, 'En fazla 30 karakter')
    .regex(/^[a-zA-Z0-9_]+$/, 'Sadece harf, rakam ve alt çizgi'),
  email: z.string().email('Geçerli bir email girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
})

type FormData = z.infer<typeof schema>

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          username: data.username,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Bir hata oluştu.')
        return
      }

      setDone(true)
    } catch (e) {
      setError('Sunucuya bağlanılamadı. Lütfen tekrar dene.')
      console.error('Signup error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen min-h-dvh flex items-center justify-center bg-[#0d0d0d] px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-3">Kayıt Alındı</h2>
          <p className="text-[#8a8a8a] text-sm leading-relaxed">
            Hesabın admin onayı bekliyor. Onaylandığında bildirim alacaksın.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center bg-[#0d0d0d] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1><Image src={logoSrc} alt="Barek" height={192} width={192} className="h-48 w-auto mx-auto" /></h1>
          <p className="text-[#8a8a8a] text-sm mt-3 tracking-wider uppercase">Bouldering Forum</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="signup-username" className="sr-only">Kullanıcı adı</label>
            <input
              {...register('username')}
              id="signup-username"
              placeholder="Kullanıcı adı"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!errors.username}
              className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-[#e05a4a] placeholder-[#8a8a8a]"
            />
            {errors.username && <p role="alert" className="text-[#e05a4a] text-xs mt-1">{errors.username.message}</p>}
          </div>

          <div>
            <label htmlFor="signup-email" className="sr-only">Email</label>
            <input
              {...register('email')}
              id="signup-email"
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
            <label htmlFor="signup-password" className="sr-only">Şifre</label>
            <input
              {...register('password')}
              id="signup-password"
              type="password"
              placeholder="Şifre (en az 8 karakter)"
              autoComplete="new-password"
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
            {loading ? 'Kayıt olunuyor...' : 'Kayıt Ol'}
          </button>
        </form>

        <p className="text-center text-[#8a8a8a] text-sm mt-6">
          Zaten hesabın var mı?{' '}
          <Link href="/login" className="text-[#e05a4a] hover:text-white transition-colors">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  )
}
