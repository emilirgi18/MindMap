'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createNote(workspaceId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: note, error } = await supabase
    .from('notes')
    .insert({ workspace_id: workspaceId, user_id: user.id, title: 'Untitled', body: '' })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  redirect(`/workspace/${workspaceId}/note/${note.id}`)
}

export async function deleteNote(noteId: string, workspaceId: string) {
  const supabase = createClient()

  const { error } = await supabase.from('notes').delete().eq('id', noteId)

  if (error) throw new Error(error.message)

  revalidatePath(`/workspace/${workspaceId}`)
  redirect(`/workspace/${workspaceId}`)
}
