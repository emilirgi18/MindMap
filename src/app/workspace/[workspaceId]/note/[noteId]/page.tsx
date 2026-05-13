import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NoteView from '@/components/editor/NoteView'
import type { KanbanColumnItem } from '@/lib/types'

export default async function NotePage({
  params,
}: {
  params: { workspaceId: string; noteId: string }
}) {
  const { workspaceId, noteId } = params
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const [{ data: note }, { data: role }, { data: profile }] = await Promise.all([
    // Stable columns only — always succeeds even before the kanban migration
    supabase
      .from('notes')
      .select('id, title, body, yjs_state, workspace_id, dm_only')
      .eq('id', noteId)
      .is('deleted_at', null)
      .single(),
    supabase.rpc('workspace_role', { p_workspace_id: workspaceId }),
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .single(),
  ])

  if (!note) notFound()

  // New columns — only exist after the kanban migration; silently ignored if absent
  const [boardRes, columnsRes] = await Promise.all([
    supabase
      .from('notes')
      .select('kanban_column_id, timeline_position')
      .eq('id', noteId)
      .single(),
    supabase
      .from('kanban_columns')
      .select('id, name, position, color')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true }),
  ])

  const boardData = boardRes.data as { kanban_column_id: string | null; timeline_position: number | null } | null
  const kanbanColumns: KanbanColumnItem[] = (columnsRes.data ?? []) as KanbanColumnItem[]

  const fullNote = {
    ...note,
    kanban_column_id: boardData?.kanban_column_id ?? null,
    timeline_position: boardData?.timeline_position ?? null,
  }

  return (
    <NoteView
      note={fullNote}
      role={(role as string | null) ?? 'player'}
      profile={profile ?? { id: user.id, full_name: null, email: user.email ?? '' }}
      kanbanColumns={kanbanColumns}
    />
  )
}
