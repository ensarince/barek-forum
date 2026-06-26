import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { emailPasswordReset } from '@/lib/email'
import { rateLimit } from '@/lib/rateLimit'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')

export async function POST(request: Request) {
  try {
    const { email } = await request.json() as { email?: string }
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email gerekli.' }, { status: 400 })
    }

    // Rate limit: 3 reset emails per email address per hour
    // Still return success so we don't reveal whether the limit was hit
    if (!rateLimit(`forgot-password:${email.trim().toLowerCase()}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ success: true })
    }

    const service = createServiceClient()

    const { data } = await service.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim(),
      options: {
        redirectTo: `${SITE}/api/auth/callback?next=/reset-password`,
      },
    })

    // Always return success — never reveal whether the email exists
    if (data?.properties?.action_link) {
      await emailPasswordReset(email.trim(), data.properties.action_link)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}
