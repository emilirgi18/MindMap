'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: 'dm' | 'player'
) {
  const supabase = createClient()
  await supabase
    .from('workspace_members')
    .update({ role })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
  revalidatePath(`/workspace/${workspaceId}/members`)
}

export async function kickMember(workspaceId: string, userId: string) {
  const supabase = createClient()
  await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
  revalidatePath(`/workspace/${workspaceId}/members`)
  revalidatePath(`/workspace/${workspaceId}`)
}
