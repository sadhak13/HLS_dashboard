import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login']
const ADMIN_ROUTES = ['/dashboard', '/branches', '/coaches', '/players', '/fees']
const COACH_ROUTES = ['/coach-dashboard', '/coach-attendance', '/coach-fees']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-project.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key',
    {
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

  // Refresh session cookie
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // --- 1. Unauthenticated user trying to access a protected route ---
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // --- 2. Authenticated user trying to access /login ---
  if (user && pathname.startsWith('/login')) {
    // Fetch their role to redirect to the correct dashboard
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'COACH') {
      return NextResponse.redirect(new URL('/coach-dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // --- 3. Role-based route protection (server-enforced) ---
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r))
    const isCoachRoute = COACH_ROUTES.some((r) => pathname.startsWith(r))

    // Coach trying to access admin area
    if (profile?.role === 'COACH' && isAdminRoute) {
      return NextResponse.redirect(new URL('/coach-dashboard', request.url))
    }

    // Admin trying to access coach area
    if (profile?.role === 'ADMIN' && isCoachRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}
