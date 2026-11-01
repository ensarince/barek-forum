import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Only same-site targets: resolve like a browser would, then compare origins
  let target = new URL('/', origin)
  try {
    const resolved = new URL(searchParams.get('next') ?? '/', origin)
    if (resolved.origin === origin) target = resolved
  } catch { /* malformed → home */ }

  // Create the redirect response FIRST so we can attach session cookies to it.
  // If we set cookies via cookies() store then return a new redirect response,
  // the cookies never make it to the browser and the session is lost.
  const response = NextResponse.redirect(target)

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    await supabase.auth.exchangeCodeForSession(code)
  }

  return response
}
