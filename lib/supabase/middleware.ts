import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { STAFF_ROLES } from '@/constants/roles'

const PUBLIC_ROUTES = ['/login']
const ADMIN_ROUTES = ['/dashboard', '/branches', '/coaches', '/managers', '/players', '/fees', '/attendance']
const COACH_ROUTES = ['/coach-dashboard', '/my-players', '/my-attendance', '/my-fees']

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
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // If refresh token is stale/invalid, treat as unauthenticated (no error spam)
  if (authError && authError.status === 400) {
    const { pathname } = request.nextUrl
    const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
    if (!isPublic) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  const { pathname } = request.nextUrl

  // --- 1. Unauthenticated user trying to access a protected route ---
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // --- 2 & 3. Role-based routing (single profile fetch) ---
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (pathname.startsWith('/login')) {
      if (profile?.role && STAFF_ROLES.includes(profile.role)) {
        return NextResponse.redirect(new URL('/coach-dashboard', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r))
    const isCoachRoute = COACH_ROUTES.some((r) => pathname.startsWith(r))

    if (profile?.role && STAFF_ROLES.includes(profile.role) && isAdminRoute) {
      return NextResponse.redirect(new URL('/coach-dashboard', request.url))
    }

    if (profile?.role === 'ADMIN' && isCoachRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}
