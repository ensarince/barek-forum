import { NextResponse, after } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { emailPasswordReset } from '@/lib/email'
import { rateLimit } from '@/lib/rateLimit'
import { clientIp } from '@/lib/requestGuards'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')

export async function POST(request: Request) {
  try {
    const { email } = await request.json() as { email?: unknown }
    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email gerekli.' }, { status: 400 })
    }
    const normalizedEmail = email.trim().toLowerCase()

    // Rate limits: 3 reset emails per address per hour, 10 requests per IP per hour.
    // Still return success so we don't reveal whether a limit was hit.
    const allowed = await rateLimit(`forgot-password:${normalizedEmail}`, 3, 60 * 60 * 1000)
      && await rateLimit(`forgot-password:ip:${clientIp(request)}`, 10, 60 * 60 * 1000)
    if (!allowed) return NextResponse.json({ success: true })

    // Look up + send AFTER responding, so the response time is the same whether or not
    // the account exists (otherwise timing reveals registered emails)
    after(async () => {
      const service = createServiceClient()
      const { data } = await service.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: {
          redirectTo: `${SITE}/api/auth/callback?next=/reset-password`,
        },
      })
      if (data?.properties?.action_link) {
        await emailPasswordReset(normalizedEmail, data.properties.action_link)
      }
    })

    // Always return success — never reveal whether the email exists
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}
