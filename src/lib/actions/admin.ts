'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Guard: all admin actions verify the caller is the admin user
async function assertAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const adminId = process.env.ADMIN_USER_ID
  if (!user || !adminId || user.id !== adminId) {
    throw new Error('Forbidden')
  }
}

export async function setUserApproved(userId: string, approved: boolean) {
  await assertAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('profiles') as any).update({ approved }).eq('id', userId)
  revalidatePath('/admin/users')
}

export async function deleteWorkspace(workspaceId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('workspaces').delete().eq('id', workspaceId)
  revalidatePath('/admin/workspaces')
}

export async function adminRevokeInvite(inviteId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('invites').delete().eq('id', inviteId)
  revalidatePath('/admin/invites')
}
