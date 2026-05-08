import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MembersView, { type MemberRow } from '@/components/members/MembersView'
import InvitePanel, { type InviteRow } from '@/components/members/InvitePanel'

export default async function MembersPage({
  params,
}: {
  params: { workspaceId: string }
}) {
  const { workspaceId } = params
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const [{ data: roleData }, { data: workspace }, { data: membersData }, { data: invitesData }] =
    await Promise.all([
      supabase.rpc('workspace_role', { p_workspace_id: workspaceId }),
      supabase
        .from('workspaces')
        .select('id, name, type, owner_id')
        .eq('id', workspaceId)
        .single(),
      supabase
        .from('workspace_members')
        .select('user_id, role, profiles(id, full_name, email)')
        .eq('workspace_id', workspaceId)
        .order('role'),
      // Pending invites (used_at is null and not expired)
      supabase
        .from('invites')
        .select('id, token, expires_at, created_at')
        .eq('workspace_id', workspaceId)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
    ])

  if (!roleData || !workspace) notFound()
  if (workspace.type === 'personal') notFound()

  type RawMember = {
    user_id: string
    role: 'owner' | 'dm' | 'player'
    profiles: { id: string; full_name: string | null; email: string } | null
  }
  const members: MemberRow[] = ((membersData ?? []) as unknown as RawMember[]).map((m) => ({
    userId: m.user_id,
    role: m.role,
    fullName: m.profiles?.full_name ?? null,
    email: m.profiles?.email ?? '',
  }))

  const ROLE_ORDER = { owner: 0, dm: 1, player: 2 }
  members.sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])

  const currentRole = roleData as 'owner' | 'dm' | 'player'
  const canManage = currentRole === 'owner' || currentRole === 'dm'

  const invites: InviteRow[] = (invitesData ?? []).map((inv) => ({
    id: inv.id,
    token: inv.token,
    expiresAt: inv.expires_at,
    createdAt: inv.created_at,
  }))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex-shrink-0 border-b border-[#2a3347]">
        <h1 className="text-2xl font-bold text-white">{workspace.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Member list + invite panel */}
      <div className="flex-1 overflow-y-auto">
        <MembersView
          members={members}
          workspaceId={workspaceId}
          currentUserId={user.id}
          currentRole={currentRole}
          ownerId={workspace.owner_id ?? ''}
        />
        <InvitePanel
          invites={invites}
          workspaceId={workspaceId}
          canManage={canManage}
        />
      </div>
    </div>
  )
}
