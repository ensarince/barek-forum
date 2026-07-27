/* eslint-disable react-hooks/purity -- reporting the current moment and measuring
   round-trip latency is the entire point of this page; it renders once per request. */
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// Always run fresh — a cached snapshot of someone else's session would be useless
// (and misleading) here.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Oturum Teşhis',
  robots: { index: false, follow: false },
}

const AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/

function maskEmail(email: string | null | undefined) {
  if (!email) return '—'
  const [name, domain] = email.split('@')
  if (!domain) return '—'
  return `${name.slice(0, 2)}***@${domain}`
}

function Row({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-[#2a2a2a]">
      <span className="text-[#6b6b6b] shrink-0">{label}</span>
      <span className={`text-right break-all ${bad ? 'text-[#c0392b]' : 'text-[#e8e8e8]'}`}>{value}</span>
    </div>
  )
}

export default async function SessionDebugPage() {
  const cookieStore = await cookies()
  const headerStore = await headers()

  const allCookies = cookieStore.getAll()
  const authCookies = allCookies.filter((c) => AUTH_COOKIE.test(c.name))
  const authBytes = authCookies.reduce((n, c) => n + c.name.length + c.value.length, 0)

  const supabase = await createClient()

  // getUser() = network round-trip to Supabase. This is the call the proxy makes on
  // every request, so its latency here is the number that matters.
  const startedUser = Date.now()
  let userState = 'null'
  let userEmail: string | null = null
  let userError = ''
  try {
    const { data, error } = await supabase.auth.getUser()
    userState = data.user ? 'OK' : 'null'
    userEmail = data.user?.email ?? null
    if (error) userError = error.message
  } catch (e) {
    userState = 'THREW'
    userError = e instanceof Error ? e.message : String(e)
  }
  const userMs = Date.now() - startedUser

  // getSession() decodes the cookie locally — no network — so it tells us what the
  // browser actually sent, independent of connectivity.
  let expiresAt: number | null = null
  let sessionError = ''
  try {
    const { data, error } = await supabase.auth.getSession()
    expiresAt = data.session?.expires_at ?? null
    if (error) sessionError = error.message
  } catch (e) {
    sessionError = e instanceof Error ? e.message : String(e)
  }

  const nowSec = Math.floor(Date.now() / 1000)
  const secondsLeft = expiresAt ? expiresAt - nowSec : null
  const expiryLabel =
    secondsLeft === null
      ? 'oturum yok'
      : secondsLeft <= 0
        ? `SÜRESİ DOLMUŞ (${Math.abs(Math.round(secondsLeft / 60))} dk önce)`
        : `${Math.round(secondsLeft / 60)} dk kaldı`

  const ua = headerStore.get('user-agent') ?? '—'
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|Android/i.test(ua)

  return (
    <div className="min-h-[100dvh] bg-[#0d0d0d] px-4 py-6">
      <div className="max-w-md mx-auto font-mono text-[11px]">
        <h1 className="text-white text-sm font-bold uppercase tracking-widest mb-1">Oturum Teşhis</h1>
        <p className="text-[#6b6b6b] mb-5">
          Bu ekranın tamamının ekran görüntüsünü al ve gönder. Şifre veya token içermez.
        </p>

        <p className="text-[#8b1a1a] uppercase tracking-widest mt-5 mb-1">Tarayıcı</p>
        <Row label="iOS" value={isIOS ? 'evet' : 'hayır'} />
        <Row label="Safari" value={isSafari ? 'evet' : 'hayır'} />

        <p className="text-[#8b1a1a] uppercase tracking-widest mt-5 mb-1">Oturum Cookie&apos;si</p>
        <Row label="parça sayısı" value={String(authCookies.length)} bad={authCookies.length === 0} />
        <Row label="toplam boyut" value={`${authBytes} bayt`} bad={authBytes > 4096} />
        <Row label="diğer cookie" value={String(allCookies.length - authCookies.length)} />
        {authCookies.map((c) => (
          <Row key={c.name} label={c.name} value={`${c.value.length} bayt`} />
        ))}

        <p className="text-[#8b1a1a] uppercase tracking-widest mt-5 mb-1">Oturum Durumu</p>
        <Row label="süre" value={expiryLabel} bad={secondsLeft !== null && secondsLeft <= 0} />
        {sessionError && <Row label="getSession hata" value={sessionError} bad />}

        <p className="text-[#8b1a1a] uppercase tracking-widest mt-5 mb-1">Sunucu Doğrulama</p>
        <Row label="getUser()" value={userState} bad={userState !== 'OK'} />
        <Row label="süre" value={`${userMs} ms`} bad={userMs > 2000} />
        <Row label="email" value={maskEmail(userEmail)} />
        {userError && <Row label="hata" value={userError} bad />}

        <p className="text-[#6b6b6b] mt-6">
          {new Date().toISOString()}
        </p>

        <a
          href="/debug/session"
          className="inline-block mt-5 bg-[#8b1a1a] hover:bg-[#a82020] text-white px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest transition-colors"
        >
          Yenile
        </a>
      </div>
    </div>
  )
}
