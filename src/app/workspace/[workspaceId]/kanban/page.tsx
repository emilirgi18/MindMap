import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import KanbanView from '@/components/kanban/KanbanView'
import type { KanbanColumnItem, NoteListItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function KanbanPage({
  params,
}: {
  params: { workspaceId: string }
}) {
  const { workspaceId } = params
  const supabase = createClient()

  const { data: role } = await supabase.rpc('workspace_role', {
    p_workspace_id: workspaceId,
  })
  if (!role) notFound()

  const [columnsRes, notesRes, noteFolderRes, tagsRes] = await Promise.all([
    supabase
      .from('kanban_columns')
      .select('id, name, position, color')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true }),
    supabase
      .from('notes')
      .select('id, title, body, dm_only, updated_at, kanban_column_id, kanban_position, timeline_position')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .not('kanban_column_id', 'is', null),
    supabase
      .from('notes')
      .select('id, folder_id')
      .eq('workspace_id', workspaceId),
    supabase
      .from('tags')
      .select('note_id, name')
      .eq('workspace_id' as never, workspaceId),
  ])

  const tagsMap = new Map<string, string[]>()
  for (const row of (tagsRes.data ?? []) as { note_id: string; name: string }[]) {
    const arr = tagsMap.get(row.note_id) ?? []
    arr.push(row.name)
    tagsMap.set(row.note_id, arr)
  }

  const folderMap = new Map(
    (noteFolderRes.data ?? []).map((n) => [n.id, (n as { id: string; folder_id?: string | null }).folder_id ?? null]),
  )

  const notes: NoteListItem[] = (notesRes.data ?? []).map((n) => ({
    ...(n as Omit<NoteListItem, 'folder_id' | 'tags'>),
    folder_id: folderMap.get(n.id) ?? null,
    tags: tagsMap.get(n.id) ?? [],
  }))

  const columns: KanbanColumnItem[] = (columnsRes.data ?? []) as KanbanColumnItem[]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-[#2a3347] flex-shrink-0">
        <h1 className="text-lg font-semibold text-white">Kanban Board</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {columns.length} column{columns.length !== 1 ? 's' : ''} · {notes.length} card{notes.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <KanbanView
          initialColumns={columns}
          initialNotes={notes}
          workspaceId={workspaceId}
        />
      </div>
    </div>
  )
}
