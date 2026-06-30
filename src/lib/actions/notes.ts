'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createNote(workspaceId: string, folderId?: string, dmOnly = false) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: note, error } = await supabase
    .from('notes')
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      title: 'Untitled',
      body: '',
      folder_id: folderId ?? null,
      dm_only: dmOnly,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/workspace/${workspaceId}`, 'layout')
  redirect(`/workspace/${workspaceId}/note/${note.id}`)
}

export async function setNoteDmOnly(
  noteId: string,
  workspaceId: string,
  dmOnly: boolean,
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()
    if (!member || !['owner', 'dm'].includes(member.role)) {
      return { error: 'Only the DM can change this' }
    }

    const { error } = await supabase
      .from('notes')
      .update({ dm_only: dmOnly })
      .eq('id', noteId)
    if (error) return { error: error.message }

    revalidatePath(`/workspace/${workspaceId}`, 'layout')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function deleteNote(noteId: string, workspaceId: string): Promise<{ error?: string }> {
  try {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()
    if (!member) return { error: 'Not a workspace member' }

    // Soft-deleting sets deleted_at, which makes the row fail the "deleted_at
    // is null" select policy — Postgres enforces that same select policy on
    // the implicit RETURNING of an UPDATE under RLS, so this must run via the
    // service-role client (with membership/role already checked above).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any

    const { data: note } = await admin
      .from('notes')
      .select('id, dm_only')
      .eq('id', noteId)
      .eq('workspace_id', workspaceId)
      .single()
    if (!note) return { error: 'Note not found' }
    if (note.dm_only && member.role === 'player') return { error: 'Only the DM can delete DM-only notes' }

    const { error: err } = await admin
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', noteId)
    if (err) return { error: err.message }

    revalidatePath(`/workspace/${workspaceId}`, 'layout')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Delete failed' }
  }
}

export async function setNoteFolder(noteId: string, workspaceId: string, folderId: string | null) {
  const supabase = createClient()

  const { error } = await supabase
    .from('notes')
    .update({ folder_id: folderId })
    .eq('id', noteId)

  if (error) throw new Error(error.message)

  revalidatePath(`/workspace/${workspaceId}`, 'layout')
}
