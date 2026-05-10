'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createFolder(workspaceId: string): Promise<{ error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('folders')
    .insert({ workspace_id: workspaceId, name: 'New folder' })

  if (error) return { error: error.message }

  revalidatePath(`/workspace/${workspaceId}`, 'layout')
  return {}
}

export async function renameFolder(
  folderId: string,
  workspaceId: string,
  name: string
): Promise<{ error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('folders')
    .update({ name })
    .eq('id', folderId)

  if (error) return { error: error.message }

  revalidatePath(`/workspace/${workspaceId}`, 'layout')
  return {}
}

export async function deleteFolder(
  folderId: string,
  workspaceId: string
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Only owner/dm can manage folders
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()
    if (!member || member.role === 'player') return { error: 'Only the owner or DM can delete folders' }

    const admin = createAdminClient()

    const { data: folder } = await admin
      .from('folders')
      .select('id')
      .eq('id', folderId)
      .eq('workspace_id', workspaceId)
      .single()
    if (!folder) return { error: 'Folder not found' }

    const { error: softErr } = await admin
      .from('folders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', folderId)

    if (!softErr) {
      revalidatePath(`/workspace/${workspaceId}`, 'layout')
      return {}
    }

    const { error: hardErr } = await admin.from('folders').delete().eq('id', folderId)
    if (hardErr) return { error: hardErr.message }

    revalidatePath(`/workspace/${workspaceId}`, 'layout')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Delete failed' }
  }
}

export async function setFolderParent(
  folderId: string,
  workspaceId: string,
  parentId: string | null
): Promise<{ error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('folders')
    .update({ parent_id: parentId })
    .eq('id', folderId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }

  revalidatePath(`/workspace/${workspaceId}`, 'layout')
  return {}
}

export async function createSubfolder(
  parentId: string,
  workspaceId: string
): Promise<{ error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('folders')
    .insert({ workspace_id: workspaceId, name: 'New folder', parent_id: parentId })

  if (error) return { error: error.message }

  revalidatePath(`/workspace/${workspaceId}`, 'layout')
  return {}
}
