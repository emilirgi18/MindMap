'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createNote(workspaceId: string, folderId?: string) {
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
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/workspace/${workspaceId}`, 'layout')
  redirect(`/workspace/${workspaceId}/note/${note.id}`)
}

export async function deleteNote(noteId: string, workspaceId: string): Promise<{ error?: string }> {
  try {
    const supabase = createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Workspace membership check — any member can delete notes
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()
    if (!member) return { error: 'Not a workspace member' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any

    // Verify note belongs to this workspace and check dm_only restriction
    const { data: note } = await admin
      .from('notes')
      .select('id, dm_only')
      .eq('id', noteId)
      .eq('workspace_id', workspaceId)
      .single()
    if (!note) return { error: 'Note not found' }
    if (note.dm_only && member.role === 'player') return { error: 'Only the DM can delete DM-only notes' }

    // Try soft delete first (requires migration 5 — deleted_at column)
    const { error: softErr } = await admin
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', noteId)

    if (!softErr) {
      revalidatePath(`/workspace/${workspaceId}`, 'layout')
      return {}
    }

    // deleted_at column not in DB yet — hard delete (admin bypasses cascade-RLS on note_links/tags)
    const { error: hardErr } = await admin.from('notes').delete().eq('id', noteId)
    if (hardErr) return { error: hardErr.message }

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
