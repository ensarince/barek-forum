'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User } from 'lucide-react'
import type { Profile } from '@/types/database'

const profileSchema = z.object({
  full_name: z.string().max(80, 'En fazla 80 karakter').optional(),
  eight_a_url: z.string().refine(v => !v || v.startsWith('https://'), { message: 'https:// ile başlamalı' }).optional(),
  topo_url: z.string().refine(v => !v || v.startsWith('https://'), { message: 'https:// ile başlamalı' }).optional(),
  instagram_url: z.string().refine(v => !v || v.startsWith('https://'), { message: 'https:// ile başlamalı' }).optional(),
  youtube_url: z.string().refine(v => !v || v.startsWith('https://'), { message: 'https:// ile başlamalı' }).optional(),
})

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Mevcut şifre gerekli'),
  new_password: z.string().min(8, 'En az 8 karakter'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirm_password'],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function SettingsForm({ profile }: { profile: Profile }) {
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setAvatarMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
      const upData = await upRes.json() as { url?: string; error?: string }
      if (!upRes.ok) { setAvatarMsg({ ok: false, text: upData.error ?? 'Yükleme başarısız.' }); return }
      const saveRes = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: upData.url }),
      })
      if (saveRes.ok) {
        setAvatarUrl(upData.url!)
        setAvatarMsg({ ok: true, text: 'Fotoğraf güncellendi.' })
      } else {
        setAvatarMsg({ ok: false, text: 'Kayıt başarısız.' })
      }
    } catch {
      setAvatarMsg({ ok: false, text: 'Bir hata oluştu.' })
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name ?? '',
      eight_a_url: profile.eight_a_url ?? '',
      topo_url: profile.topo_url ?? '',
      instagram_url: profile.instagram_url ?? '',
      youtube_url: profile.youtube_url ?? '',
    },
  })

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  async function saveProfile(data: ProfileFormData) {
    setProfileMsg(null)
    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setProfileMsg({ ok: true, text: 'Kaydedildi.' })
    } else {
      const err = await res.json().catch(() => ({}))
      setProfileMsg({ ok: false, text: (err as { error?: string }).error ?? 'Bir hata oluştu.' })
    }
  }

  async function savePassword(data: PasswordFormData) {
    setPasswordMsg(null)
    const res = await fetch('/api/user/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: data.current_password,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      }),
    })
    if (res.ok) {
      setPasswordMsg({ ok: true, text: 'Şifre güncellendi.' })
      passwordForm.reset()
    } else {
      const err = await res.json().catch(() => ({}))
      setPasswordMsg({ ok: false, text: (err as { error?: string }).error ?? 'Bir hata oluştu.' })
    }
  }

  const inputCls = 'w-full bg-[#161616] border border-[#2a2a2a] text-[#e8e8e8] px-4 py-3 text-sm focus:outline-none focus:border-[#8b1a1a] placeholder-[#6b6b6b]'
  const labelCls = 'block text-xs uppercase tracking-[0.15em] text-[#6b6b6b] mb-1.5'
  const errorCls = 'text-[#c0392b] text-xs mt-1'

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-10">
      <h1 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b]">Ayarlar</h1>

      {/* Avatar upload */}
      <section className="bg-[#161616] border border-[#2a2a2a] p-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-4">Profil Fotoğrafı</h2>
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt={profile.username} className="w-16 h-16 object-cover border border-[#2a2a2a]" />
          ) : (
            <div className="w-16 h-16 bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center">
              <User size={24} className="text-[#2a2a2a]" />
            </div>
          )}
          <div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <button
              type="button"
              disabled={avatarUploading}
              onClick={() => avatarInputRef.current?.click()}
              className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e8e8] hover:border-[#8b1a1a] px-4 py-2 text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              {avatarUploading ? 'Yükleniyor...' : 'Fotoğraf Değiştir'}
            </button>
            {avatarMsg && (
              <p className={`text-xs mt-1 ${avatarMsg.ok ? 'text-green-500' : 'text-[#c0392b]'}`}>{avatarMsg.text}</p>
            )}
          </div>
        </div>
      </section>

      {/* Profile info + links */}
      <section className="bg-[#161616] border border-[#2a2a2a] p-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-6">Profil Bilgileri</h2>
        <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
          <div>
            <label className={labelCls}>Kullanıcı Adı</label>
            <input
              value={profile.username}
              readOnly
              className={`${inputCls} opacity-40 cursor-not-allowed`}
            />
          </div>

          <div>
            <label className={labelCls}>Ad Soyad (opsiyonel)</label>
            <input
              {...profileForm.register('full_name')}
              placeholder="Adın ve soyadın"
              className={inputCls}
            />
            {profileForm.formState.errors.full_name && (
              <p className={errorCls}>{profileForm.formState.errors.full_name.message}</p>
            )}
          </div>

          <div className="pt-2 border-t border-[#2a2a2a]">
            <h3 className="text-xs uppercase tracking-[0.15em] text-[#6b6b6b] mb-4">Dış Bağlantılar</h3>
            <div className="space-y-3">
              {[
                { name: 'eight_a_url' as const, label: '8a.nu', placeholder: 'https://www.8a.nu/user/kullaniciadi' },
                { name: 'topo_url' as const, label: '27crags', placeholder: 'https://27crags.com/climbers/kullaniciadi' },
                { name: 'instagram_url' as const, label: 'Instagram', placeholder: 'https://instagram.com/kullaniciadi' },
                { name: 'youtube_url' as const, label: 'YouTube', placeholder: 'https://youtube.com/@kullaniciadi' },
              ].map(({ name, label, placeholder }) => (
                <div key={name}>
                  <label className={labelCls}>{label}</label>
                  <input
                    {...profileForm.register(name)}
                    placeholder={placeholder}
                    className={inputCls}
                  />
                  {profileForm.formState.errors[name] && (
                    <p className={errorCls}>{profileForm.formState.errors[name]?.message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {profileMsg && (
            <p className={profileMsg.ok ? 'text-green-500 text-sm' : errorCls}>{profileMsg.text}</p>
          )}

          <button
            type="submit"
            disabled={profileForm.formState.isSubmitting}
            className="bg-[#8b1a1a] hover:bg-[#a82020] text-white px-4 py-2 text-sm font-semibold uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            {profileForm.formState.isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      </section>

      {/* Password */}
      <section className="bg-[#161616] border border-[#2a2a2a] p-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-6">Şifre Değiştir</h2>
        <form onSubmit={passwordForm.handleSubmit(savePassword)} className="space-y-4">
          <div>
            <label className={labelCls}>Mevcut Şifre</label>
            <input
              {...passwordForm.register('current_password')}
              type="password"
              placeholder="Mevcut şifreni gir"
              className={inputCls}
            />
            {passwordForm.formState.errors.current_password && (
              <p className={errorCls}>{passwordForm.formState.errors.current_password.message}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Yeni Şifre</label>
            <input
              {...passwordForm.register('new_password')}
              type="password"
              placeholder="En az 8 karakter"
              className={inputCls}
            />
            {passwordForm.formState.errors.new_password && (
              <p className={errorCls}>{passwordForm.formState.errors.new_password.message}</p>
            )}
          </div>

          <div>
            <label className={labelCls}>Şifre Tekrar</label>
            <input
              {...passwordForm.register('confirm_password')}
              type="password"
              placeholder="Şifreyi tekrar gir"
              className={inputCls}
            />
            {passwordForm.formState.errors.confirm_password && (
              <p className={errorCls}>{passwordForm.formState.errors.confirm_password.message}</p>
            )}
          </div>

          {passwordMsg && (
            <p className={passwordMsg.ok ? 'text-green-500 text-sm' : errorCls}>{passwordMsg.text}</p>
          )}

          <button
            type="submit"
            disabled={passwordForm.formState.isSubmitting}
            className="bg-[#8b1a1a] hover:bg-[#a82020] text-white px-4 py-2 text-sm font-semibold uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            {passwordForm.formState.isSubmitting ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
      </section>
    </div>
  )
}
