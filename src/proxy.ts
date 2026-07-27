import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// @supabase/ssr stores the session as sb-<project-ref>-auth-token, split into
// .0/.1/... chunks when it outgrows the 4KB cookie limit.
const AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Pass through if Supabase isn't configured yet (local preview)
  if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url' || !supabaseKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Any redirect MUST carry the cookies Supabase just wrote, otherwise a rotated
  // refresh token never reaches the browser. The old one is already revoked
  // server-side at that point, so the session dies and every later request
  // bounces back here — a permanent login loop until cookies are cleared by hand.
  function redirectTo(path: string) {
    const response = NextResponse.redirect(new URL(path, request.url))
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
  }

  const { pathname } = request.nextUrl

  // Session diagnostics have to stay reachable even when auth is broken
  if (pathname.startsWith('/debug')) return supabaseResponse

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')
  const isLimboRoute = pathname.startsWith('/pending') || pathname.startsWith('/rejected')
  const isAdminRoute = pathname.startsWith('/admin')

  let user = null
  let lookupFailed = false
  try {
    const { data, error } = await supabase.auth.getUser()
    user = data.user
    if (error) lookupFailed = true
  } catch {
    lookupFailed = true
  }

  if (!user) {
    if (isAuthRoute) return supabaseResponse

    // The proxy is only an optimistic check — Next.js docs warn against using it
    // for real session management, and every layout re-verifies with getUser()
    // before rendering. So when the browser did send a session but the lookup
    // failed, let the request through instead of bouncing to /login: on mobile
    // connections these calls drop often enough to look like a broken login.
    const hasAuthCookie = request.cookies.getAll().some((c) => AUTH_COOKIE.test(c.name))
    if (hasAuthCookie && lookupFailed) return supabaseResponse

    return redirectTo('/login')
  }

  // Logged in on login/signup → redirect to forum (but allow password reset pages)
  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, role')
      .eq('id', user.id)
      .single()

    if (profile?.status === 'pending') return redirectTo('/pending')
    if (profile?.status === 'rejected') return redirectTo('/rejected')
    return redirectTo('/')
  }

  // Logged in, check profile status on protected routes
  if (!isLimboRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, role')
      .eq('id', user.id)
      .single()

    if (profile?.status === 'pending') return redirectTo('/pending')
    if (profile?.status === 'rejected') return redirectTo('/rejected')

    // Admin-only routes. Skipped when the profile lookup came back empty so a
    // dropped request can't lock an admin out — /admin/layout.tsx checks the role
    // again server-side before rendering anything.
    if (isAdminRoute && profile && profile.role !== 'admin') {
      return redirectTo('/')
    }
  }

  return supabaseResponse
}

export default proxy

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|api).*)'],
}
