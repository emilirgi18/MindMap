'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createInvite(workspaceId: string): Promise<{ error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { error } = await supabase.from('invites').insert({
    workspace_id: workspaceId,
    created_by: user.id,
    expires_at: expiresAt.toISOString(),
  })

  if (error) return { error: error.message }

  revalidatePath(`/workspace/${workspaceId}/members`)
  return {}
}

export async function revokeInvite(workspaceId: string, inviteId: string) {
  const supabase = createClient()
  await supabase.from('invites').delete().eq('id', inviteId)
  revalidatePath(`/workspace/${workspaceId}/members`)
}
