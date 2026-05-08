import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar/Sidebar'
import type { WorkspaceWithRole, NoteListItem, UserProfile } from '@/lib/types'

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { workspaceId: string }
}) {
  const { workspaceId } = params
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Parallel fetch: workspaces+roles, notes in current workspace, profile
  const [membershipsRes, notesRes, profileRes] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('role, workspaces(id, name, type, owner_id)')
      .eq('user_id', user.id),
    supabase
      .from('notes')
      .select('id, title, dm_only, updated_at')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(200),
    supabase.from('profiles').select('id, full_name, email').eq('id', user.id).single(),
  ])

  // Flatten the nested join result into WorkspaceWithRole[]
  type MemberRow = {
    role: WorkspaceWithRole['role']
    workspaces: {
      id: string
      name: string
      type: 'personal' | 'campaign'
      owner_id: string | null
    } | null
  }

  const workspaces: WorkspaceWithRole[] = ((membershipsRes.data ?? []) as unknown as MemberRow[])
    .filter((m) => m.workspaces !== null)
    .map((m) => ({ ...(m.workspaces as NonNullable<MemberRow['workspaces']>), role: m.role }))
    .sort((a, b) => {
      if (a.type === 'personal') return -1
      if (b.type === 'personal') return 1
      return a.name.localeCompare(b.name)
    })

  // Guard: if user isn't a member of this workspace, send them home
  const current = workspaces.find((w) => w.id === workspaceId)
  if (!current) redirect('/')

  const notes: NoteListItem[] = (notesRes.data ?? []) as NoteListItem[]

  const profile: UserProfile = profileRes.data ?? {
    id: user.id,
    full_name: null,
    email: user.email ?? '',
  }

  const isAdmin = !!process.env.ADMIN_USER_ID && user.id === process.env.ADMIN_USER_ID

  return (
    <div className="h-screen flex overflow-hidden bg-[#0f1117]">
      <Sidebar
        workspaces={workspaces}
        notes={notes}
        currentWorkspaceId={workspaceId}
        currentRole={current.role}
        profile={profile}
        isAdmin={isAdmin}
      />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
