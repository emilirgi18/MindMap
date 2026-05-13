'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function MindMapLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="20" cy="20" r="5.5" fill="#f97316" />
      <circle cx="7"  cy="8"  r="3" fill="#f97316" opacity="0.5" />
      <circle cx="33" cy="8"  r="3" fill="#f97316" opacity="0.5" />
      <circle cx="7"  cy="32" r="3" fill="#f97316" opacity="0.5" />
      <circle cx="33" cy="32" r="3" fill="#f97316" opacity="0.5" />
      <line x1="15.1" y1="16.4" x2="9.5"  y2="10.3" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <line x1="24.9" y1="16.4" x2="30.5" y2="10.3" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <line x1="15.1" y1="23.6" x2="9.5"  y2="29.7" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <line x1="24.9" y1="23.6" x2="30.5" y2="29.7" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const supabase = createClient()

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
        <div className="w-[480px] h-[480px] rounded-full bg-orange-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm px-8 py-10 rounded-2xl bg-[#1e293b] border border-[#334155] shadow-2xl space-y-7">
        {/* Logo + brand */}
        <div className="flex flex-col items-center gap-4">
          <MindMapLogo size={48} />
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight">MindMap</h1>
            <p className="mt-1.5 text-sm text-slate-400">Sign in to continue</p>
          </div>
        </div>

        <div className="border-t border-[#334155]" />

        {/* Google sign-in */}
        <button
          onClick={handleGoogle}
          className="w-full py-2.5 px-4 rounded-lg border border-[#334155] bg-[#293548] hover:bg-[#334155] hover:border-orange-500/40 text-slate-100 text-sm font-medium transition-all duration-150 flex items-center justify-center gap-3"
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </button>

        <p className="text-center text-xs text-slate-600">
          By continuing you agree to our terms of service
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
