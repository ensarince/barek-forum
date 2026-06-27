import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
  })

  // Optimistic session check — reads and validates the JWT locally, no network call.
  // Full verification (getUser + profile status) is done in each layout.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const { pathname } = request.nextUrl

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password')

  // Not logged in → send to login (except auth routes)
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in on login/signup → redirect to forum
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export default proxy

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|api).*)'],
}
