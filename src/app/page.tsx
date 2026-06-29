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

  // Workspace not visible — either the user isn't approved yet (RLS hides it)
  // or the bootstrap trigger failed. Check approval and route accordingly.
  const { data: profile } = await supabase
    .from('profiles')
    .select('approved')
    .eq('id', user.id)
    .single()

  if (!profile?.approved) {
    redirect('/pending')
  }

  // Approved but no personal workspace found — trigger likely failed at sign-up.
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
      <p className="text-gray-400 text-sm">Setting up your workspace…</p>
    </div>
  )
}
