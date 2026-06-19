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
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-3">Kayıt Alındı</h2>
          <p className="text-[#6b6b6b] text-sm leading-relaxed">
            Hesabın admin onayı bekliyor. Onaylandığında bildirim alacaksın.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Image src={logoSrc} alt="Barek" height={192} width={192} className="h-48 w-auto mx-auto" />
          <p className="text-[#6b6b6b] text-sm mt-3 tracking-wider uppercase">Bouldering Forum</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <input
              {...register('username')}
              placeholder="Kullanıcı adı"
              className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b]"
            />
            {errors.username && <p className="text-[#c0392b] text-xs mt-1">{errors.username.message}</p>}
          </div>

          <div>
            <input
              {...register('email')}
              type="email"
              placeholder="Email"
              className="w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b]"
            />
            {errors.email && <p className="text-[#c0392b] text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <input
              {...register('password')}
              type="password"
              placeholder="Şifre (en az 8 karakter)"
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
            {loading ? 'Kayıt olunuyor...' : 'Kayıt Ol'}
          </button>
        </form>

        <p className="text-center text-[#6b6b6b] text-sm mt-6">
          Zaten hesabın var mı?{' '}
          <Link href="/login" className="text-[#c0392b] hover:text-white transition-colors">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  )
}
