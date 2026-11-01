import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  // Block cross-site logout (another site POSTing here)
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const supabase = await createClient()
  await supabase.auth.signOut()
  // Home, not /login — logged-out visitors can read the forum, and the login button is right there
  return NextResponse.redirect(new URL('/', request.nextUrl.origin), { status: 303 })
}
