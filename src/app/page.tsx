import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Root route: redirect authenticated users to their personal workspace.
// The middleware guarantees the user is authenticated and approved by this point.
export default async function HomePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('type', 'personal')
    .eq('owner_id', user.id)
    .single()

  if (workspace) {
    redirect(`/workspace/${workspace.id}`)
  }

  // Shouldn't normally reach here — personal workspace is created by the DB
  // trigger on sign-up. Show a graceful fallback just in case.
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
      <p className="text-gray-400 text-sm">Setting up your workspace…</p>
    </div>
  )
}
