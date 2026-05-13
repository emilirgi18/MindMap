import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TimelineView from '@/components/timeline/TimelineView'
import type { NoteListItem } from '@/lib/types'

export default async function TimelinePage({
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

  const [notesRes, noteFolderRes] = await Promise.all([
    supabase
      .from('notes')
      .select('id, title, body, dm_only, updated_at, kanban_column_id, kanban_position, timeline_position')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .not('timeline_position', 'is', null)
      .order('timeline_position', { ascending: true }),
    supabase
      .from('notes')
      .select('id, folder_id')
      .eq('workspace_id', workspaceId),
  ])

  const allNoteIds = (notesRes.data ?? []).map((n) => n.id)
  const tagsRes = allNoteIds.length > 0
    ? await supabase.from('tags').select('note_id, name').in('note_id', allNoteIds)
    : { data: [] }

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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-[#2a3347] flex-shrink-0">
        <h1 className="text-lg font-semibold text-white">Timeline</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {notes.length} event{notes.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <TimelineView initialNotes={notes} workspaceId={workspaceId} />
      </div>
    </div>
  )
}
