'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

export async function deleteNote(noteId: string, workspaceId: string) {
  const supabase = createClient()

  const { error } = await supabase.from('notes').delete().eq('id', noteId)

  if (error) throw new Error(error.message)

  revalidatePath(`/workspace/${workspaceId}`, 'layout')
  redirect(`/workspace/${workspaceId}`)
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
