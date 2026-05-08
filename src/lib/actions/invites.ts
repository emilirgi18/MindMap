'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createInvite(workspaceId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await supabase.from('invites').insert({
    workspace_id: workspaceId,
    created_by: user.id,
    expires_at: expiresAt.toISOString(),
  })

  revalidatePath(`/workspace/${workspaceId}/members`)
}

export async function revokeInvite(workspaceId: string, inviteId: string) {
  const supabase = createClient()
  await supabase.from('invites').delete().eq('id', inviteId)
  revalidatePath(`/workspace/${workspaceId}/members`)
}
