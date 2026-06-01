import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session and get the current authenticated user securely
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isCaptainRoute = pathname.startsWith('/captain')
  const isProtectedRoute = isDashboardRoute || isCaptainRoute
  const isLoginRoute = pathname === '/login'

  // Helper to redirect while preserving any refreshed cookies
  const redirectWithCookies = (targetUrl: string | URL) => {
    const redirectResponse = NextResponse.redirect(targetUrl)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        expires: cookie.expires,
        maxAge: cookie.maxAge,
      })
    })
    return redirectResponse
  }

  if (!user) {
    // 1. Not logged in: Redirect protected routes to login
    if (isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', pathname)
      return redirectWithCookies(url)
    }
  } else {
    // 2. Logged in
    const role = (user.user_metadata?.role as string) || 'captain'

    // If trying to access login page, redirect to their home page based on role
    if (isLoginRoute) {
      const url = request.nextUrl.clone()
      url.pathname = (role === 'admin' || role === 'manager') ? '/dashboard' : '/captain/tables'
      return redirectWithCookies(url)
    }

    // Role-based route protection for admin/manager pages
    if (isDashboardRoute) {
      if (role !== 'admin' && role !== 'manager') {
        const url = request.nextUrl.clone()
        url.pathname = '/captain/tables'
        return redirectWithCookies(url)
      }
    }

    // Role-based route protection for captain pages
    if (isCaptainRoute) {
      if (role !== 'captain' && role !== 'admin' && role !== 'manager') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return redirectWithCookies(url)
      }
    }
  }

  return supabaseResponse
}
