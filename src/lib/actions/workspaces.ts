'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createCampaignWorkspace(name: string) {
  const supabase = createClient()

  const { data: workspaceId, error } = await supabase.rpc(
    'create_campaign_workspace',
    { p_name: name }
  )

  if (error) throw new Error(error.message)

  redirect(`/workspace/${workspaceId}`)
}

export async function renameWorkspace(workspaceId: string, name: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('workspaces')
    .update({ name: name.trim() })
    .eq('id', workspaceId)

  if (error) throw new Error(error.message)

  revalidatePath(`/workspace/${workspaceId}`)
}
