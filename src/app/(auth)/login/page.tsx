'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
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

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) {
        setError('Email veya şifre hatalı.')
        return
      }
      window.location.href = '/'
    } catch (e) {
      setError('Bir hata oluştu. Lütfen tekrar dene.')
      console.error('Login error:', e)
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
          <input
            {...register('email')}
            type="email"
            placeholder="Email"
            autoComplete="email"
            className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b]"
          />
          {errors.email && <p className="text-[#c0392b] text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <input
            {...register('password')}
            type="password"
            placeholder="Şifre"
            autoComplete="current-password"
            className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b]"
          />
          {errors.password && <p className="text-[#c0392b] text-xs mt-1">{errors.password.message}</p>}
        </div>

        {error && <p className="text-[#c0392b] text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#8b1a1a] hover:bg-[#a82020] text-white py-3 text-sm font-semibold uppercase tracking-widest transition-colors disabled:opacity-50"
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
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
