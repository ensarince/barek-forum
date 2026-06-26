import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { emailPasswordReset } from '@/lib/email'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')

export async function POST(request: Request) {
  try {
    const { email } = await request.json() as { email?: string }
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email gerekli.' }, { status: 400 })
    }

    const service = createServiceClient()

    // Generate reset link server-side — service role bypasses any SMTP config
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
