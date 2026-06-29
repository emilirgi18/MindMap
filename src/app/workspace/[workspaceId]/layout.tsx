import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar/Sidebar'
import TopBar from '@/components/sidebar/TopBar'
import { RouterProgress } from '@/components/RouterProgress'
import type { WorkspaceWithRole, NoteListItem, FolderItem, UserProfile } from '@/lib/types'

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

  // Parallel fetch: workspaces+roles, notes, folders, profile
  const [membershipsRes, notesRes, foldersRes, profileRes] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('role, workspaces(id, name, type, owner_id)')
      .eq('user_id', user.id),
    supabase
      .from('notes')
      .select('id, title, dm_only, updated_at, folder_id')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(200),
    supabase
      .from('folders')
      .select('id, name, parent_id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, full_name, email').eq('id', user.id).single(),
  ])

  // Fetch tags for all notes in this workspace (used for tag-based search)
  const allNoteIds = (notesRes.data ?? []).map((n) => n.id)
  const tagsRes = allNoteIds.length > 0
    ? await supabase.from('tags').select('note_id, name').in('note_id', allNoteIds)
    : { data: [] }

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

  // Build tags map
  const tagsMap = new Map<string, string[]>()
  for (const row of (tagsRes.data ?? [])) {
    const r = row as { note_id: string; name: string }
    const arr = tagsMap.get(r.note_id) ?? []
    arr.push(r.name)
    tagsMap.set(r.note_id, arr)
  }
  const notes: NoteListItem[] = (notesRes.data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    dm_only: n.dm_only,
    updated_at: n.updated_at,
    folder_id: (n.folder_id as string | null) ?? null,
    kanban_column_id: null,
    kanban_position: null,
    timeline_position: null,
    tags: tagsMap.get(n.id) ?? [],
  }))
  const folders: FolderItem[] = (foldersRes.data ?? []) as FolderItem[]

  const profile: UserProfile = profileRes.data ?? {
    id: user.id,
    full_name: null,
    email: user.email ?? '',
  }

  const isAdmin = !!process.env.ADMIN_USER_ID && user.id === process.env.ADMIN_USER_ID

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0f1117]">
      <RouterProgress />
      <TopBar
        workspaces={workspaces}
        currentWorkspaceId={workspaceId}
        currentRole={current.role}
        profile={profile}
        isAdmin={isAdmin}
      />
      <div className="flex-1 min-w-0 flex overflow-hidden">
        <Sidebar
          notes={notes}
          folders={folders}
          workspaceId={workspaceId}
          currentRole={current.role}
        />
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
