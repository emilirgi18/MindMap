import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'

// Routes that bypass session + approval checks entirely
const PUBLIC_PREFIXES = ['/login', '/pending', '/auth/', '/invite/']

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Build a mutable response so cookie mutations can be forwarded
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Mirror mutations onto both the request and the response so the
          // session is visible to downstream Server Components in the same
          // render pass.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Always validate the JWT with the Auth server (prevents stale-token attacks)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes: still refresh the session cookie, but skip auth gates
  if (isPublic(pathname)) {
    return response
  }

  // Unauthenticated → /login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Approval check — reads own profile row (always accessible via RLS)
  const { data: profile } = await supabase
    .from('profiles')
    .select('approved')
    .eq('id', user.id)
    .single()

  if (!profile?.approved) {
    return NextResponse.redirect(new URL('/pending', request.url))
  }

  // Admin gate — only the designated admin user may access /admin
  if (pathname.startsWith('/admin')) {
    const adminUserId = process.env.ADMIN_USER_ID
    if (!adminUserId || user.id !== adminUserId) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
