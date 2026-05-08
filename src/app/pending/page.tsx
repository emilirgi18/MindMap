import { createClient } from '@/lib/supabase/server'

export default async function PendingPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  async function signOut() {
    'use server'
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
      <div className="w-full max-w-md p-8 rounded-xl bg-[#161b27] border border-[#2a3347] text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
          <svg
            className="h-6 w-6 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-white">Account Pending Approval</h1>
          <p className="mt-2 text-sm text-gray-400 leading-relaxed">
            Your account has been created and is awaiting administrator approval.
            You&apos;ll be able to access MindMap once your account has been reviewed.
          </p>
        </div>

        {user && (
          <p className="text-xs text-gray-600">Signed in as {user.email}</p>
        )}

        <form action={signOut}>
          <button
            type="submit"
            className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
