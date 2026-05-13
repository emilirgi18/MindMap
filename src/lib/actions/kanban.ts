'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function assertMember(workspaceId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()
  if (!member) throw new Error('Not a workspace member')
  return { supabase, user, role: member.role }
}

function revalidate(workspaceId: string) {
  revalidatePath(`/workspace/${workspaceId}`, 'layout')
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

export async function createKanbanColumn(
  workspaceId: string,
  name: string,
  color?: string,
): Promise<{ id: string } | { error: string }> {
  try {
    const { supabase } = await assertMember(workspaceId)

    // Place after the last existing column
    const { data: existing } = await supabase
      .from('kanban_columns')
      .select('position')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: false })
      .limit(1)

    const position = existing && existing.length > 0 ? existing[0].position + 1000 : 0

    const { data, error } = await supabase
      .from('kanban_columns')
      .insert({ workspace_id: workspaceId, name, position, color: color ?? null })
      .select('id')
      .single()

    if (error) return { error: error.message }
    revalidate(workspaceId)
    return { id: data.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function updateKanbanColumn(
  columnId: string,
  workspaceId: string,
  patch: { name?: string; color?: string | null },
): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertMember(workspaceId)
    const { error } = await supabase
      .from('kanban_columns')
      .update(patch)
      .eq('id', columnId)
      .eq('workspace_id', workspaceId)
    if (error) return { error: error.message }
    revalidate(workspaceId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function deleteKanbanColumn(
  columnId: string,
  workspaceId: string,
): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertMember(workspaceId)
    // Unassign notes first (FK is ON DELETE SET NULL but let's be explicit)
    await supabase
      .from('notes')
      .update({ kanban_column_id: null, kanban_position: null })
      .eq('kanban_column_id', columnId)

    const { error } = await supabase
      .from('kanban_columns')
      .delete()
      .eq('id', columnId)
      .eq('workspace_id', workspaceId)
    if (error) return { error: error.message }
    revalidate(workspaceId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

// orderedIds: all column ids for this workspace in desired order
export async function reorderKanbanColumns(
  workspaceId: string,
  orderedIds: string[],
): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertMember(workspaceId)
    await Promise.all(
      orderedIds.map((id, i) =>
        supabase
          .from('kanban_columns')
          .update({ position: i * 1000 })
          .eq('id', id)
          .eq('workspace_id', workspaceId),
      ),
    )
    revalidate(workspaceId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

// ---------------------------------------------------------------------------
// Note ↔ kanban column
// ---------------------------------------------------------------------------

// orderedNoteIds: all note ids in the target column in desired order
export async function moveNoteToColumn(
  noteId: string,
  workspaceId: string,
  columnId: string | null,
  orderedColumnNoteIds?: string[],
): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertMember(workspaceId)

    if (columnId === null) {
      const { error } = await supabase
        .from('notes')
        .update({ kanban_column_id: null, kanban_position: null })
        .eq('id', noteId)
        .eq('workspace_id', workspaceId)
      if (error) return { error: error.message }
    } else {
      // Determine position: end of target column unless full reorder provided
      let position: number
      if (orderedColumnNoteIds) {
        position = orderedColumnNoteIds.indexOf(noteId) * 1000
      } else {
        const { data: existing } = await supabase
          .from('notes')
          .select('kanban_position')
          .eq('kanban_column_id', columnId)
          .order('kanban_position', { ascending: false })
          .limit(1)
        position = existing && existing.length > 0
          ? (existing[0].kanban_position ?? 0) + 1000
          : 0
      }

      const { error } = await supabase
        .from('notes')
        .update({ kanban_column_id: columnId, kanban_position: position })
        .eq('id', noteId)
        .eq('workspace_id', workspaceId)
      if (error) return { error: error.message }
    }

    // If a full ordered list was given, reindex the whole column
    if (orderedColumnNoteIds && columnId) {
      await Promise.all(
        orderedColumnNoteIds.map((id, i) =>
          supabase
            .from('notes')
            .update({ kanban_position: i * 1000 })
            .eq('id', id),
        ),
      )
    }

    revalidate(workspaceId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

// Full reindex after drag within or across columns
export async function reorderKanbanNotes(
  workspaceId: string,
  updates: { noteId: string; columnId: string; position: number }[],
): Promise<{ error?: string }> {
  try {
    await assertMember(workspaceId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    await Promise.all(
      updates.map(({ noteId, columnId, position }) =>
        admin
          .from('notes')
          .update({ kanban_column_id: columnId, kanban_position: position })
          .eq('id', noteId),
      ),
    )
    revalidate(workspaceId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

// ---------------------------------------------------------------------------
// Note ↔ timeline
// ---------------------------------------------------------------------------

export async function addNoteToTimeline(
  noteId: string,
  workspaceId: string,
): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertMember(workspaceId)
    const { data: existing } = await supabase
      .from('notes')
      .select('timeline_position')
      .eq('workspace_id', workspaceId)
      .not('timeline_position', 'is', null)
      .order('timeline_position', { ascending: false })
      .limit(1)

    const position = existing && existing.length > 0
      ? (existing[0].timeline_position ?? 0) + 1000
      : 0

    const { error } = await supabase
      .from('notes')
      .update({ timeline_position: position })
      .eq('id', noteId)
      .eq('workspace_id', workspaceId)
    if (error) return { error: error.message }
    revalidate(workspaceId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function removeNoteFromTimeline(
  noteId: string,
  workspaceId: string,
): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertMember(workspaceId)
    const { error } = await supabase
      .from('notes')
      .update({ timeline_position: null })
      .eq('id', noteId)
      .eq('workspace_id', workspaceId)
    if (error) return { error: error.message }
    revalidate(workspaceId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function reorderTimeline(
  workspaceId: string,
  orderedNoteIds: string[],
): Promise<{ error?: string }> {
  try {
    await assertMember(workspaceId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    await Promise.all(
      orderedNoteIds.map((id, i) =>
        admin
          .from('notes')
          .update({ timeline_position: i * 1000 })
          .eq('id', id),
      ),
    )
    revalidate(workspaceId)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}
