import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Handles the OAuth redirect from Supabase Auth (Google, etc.)
// Also used by magic-link email sign-ins.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // next is user-supplied; force it to be a relative path
      const safeNext = next.startsWith('/') ? next : '/'
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
