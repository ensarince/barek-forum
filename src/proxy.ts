import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')
  const isLimboRoute = pathname.startsWith('/pending') || pathname.startsWith('/rejected')
  const isAdminRoute = pathname.startsWith('/admin')

  // Not logged in → send to login (except auth routes)
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in on login/signup → redirect to forum (but allow password reset pages)
  const isLoginOrSignup = pathname.startsWith('/login') || pathname.startsWith('/signup')
  if (user && isLoginOrSignup) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, role')
      .eq('id', user.id)
      .single()

    if (profile?.status === 'pending') return NextResponse.redirect(new URL('/pending', request.url))
    if (profile?.status === 'rejected') return NextResponse.redirect(new URL('/rejected', request.url))
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Logged in, check profile status on protected routes
  if (user && !isLimboRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, role')
      .eq('id', user.id)
      .single()

    if (profile?.status === 'pending') return NextResponse.redirect(new URL('/pending', request.url))
    if (profile?.status === 'rejected') return NextResponse.redirect(new URL('/rejected', request.url))

    // Admin-only routes
    if (isAdminRoute && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export default proxy

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|api).*)'],
}
