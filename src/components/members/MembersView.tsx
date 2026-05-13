'use client'

import { useTransition } from 'react'
import { updateMemberRole, kickMember } from '@/lib/actions/members'
import { getUserColor } from '@/lib/yjs/utils'

export interface MemberRow {
  userId: string
  role: 'owner' | 'dm' | 'player'
  fullName: string | null
  email: string
}

interface Props {
  members: MemberRow[]
  workspaceId: string
  currentUserId: string
  currentRole: 'owner' | 'dm' | 'player'
  ownerId: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  dm: 'DM',
  player: 'Player',
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'text-orange-400 bg-orange-500/15',
  dm: 'text-orange-300 bg-orange-500/10',
  player: 'text-slate-400 bg-slate-700/50',
}

export default function MembersView({
  members,
  workspaceId,
  currentUserId,
  currentRole,
  ownerId,
}: Props) {
  const isOwner = currentRole === 'owner'

  return (
    <div className="divide-y divide-[#334155]">
      {members.map((member) => (
        <MemberRow
          key={member.userId}
          member={member}
          workspaceId={workspaceId}
          isOwner={isOwner}
          isCurrentUser={member.userId === currentUserId}
          isWorkspaceOwner={member.userId === ownerId}
        />
      ))}
    </div>
  )
}

function MemberRow({
  member,
  workspaceId,
  isOwner,
  isCurrentUser,
  isWorkspaceOwner,
}: {
  member: MemberRow
  workspaceId: string
  isOwner: boolean
  isCurrentUser: boolean
  isWorkspaceOwner: boolean
}) {
  const [pending, startTransition] = useTransition()

  const displayName = member.fullName ?? member.email
  const avatarChar = displayName?.[0]?.toUpperCase() ?? '?'
  const avatarColor = getUserColor(member.userId)
  const canEditRole = isOwner && !isWorkspaceOwner
  const canKick = isOwner && !isWorkspaceOwner && !isCurrentUser

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const role = e.target.value as 'dm' | 'player'
    startTransition(() => updateMemberRole(workspaceId, member.userId, role))
  }

  function handleKick() {
    if (!confirm(`Remove ${displayName} from this workspace?`)) return
    startTransition(() => kickMember(workspaceId, member.userId))
  }

  return (
    <div
      className={`flex items-center gap-3 px-6 py-3 transition-opacity ${pending ? 'opacity-50' : ''}`}
    >
      {/* Avatar */}
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 select-none"
        style={{ backgroundColor: avatarColor }}
      >
        {avatarChar}
      </div>

      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-200 truncate">{displayName}</span>
          {isCurrentUser && (
            <span className="text-xs text-slate-500">(you)</span>
          )}
        </div>
        {member.fullName && (
          <span className="text-xs text-slate-500 truncate">{member.email}</span>
        )}
      </div>

      {/* Role */}
      {canEditRole ? (
        <select
          value={member.role}
          onChange={handleRoleChange}
          disabled={pending}
          className="text-xs bg-[#293548] border border-[#334155] rounded-md px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
        >
          <option value="dm">DM</option>
          <option value="player">Player</option>
        </select>
      ) : (
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-md ${ROLE_COLORS[member.role]}`}
        >
          {ROLE_LABELS[member.role]}
        </span>
      )}

      {/* Kick */}
      {canKick && (
        <button
          onClick={handleKick}
          disabled={pending}
          title="Remove member"
          className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
        >
          <XIcon />
        </button>
      )}
    </div>
  )
}

function XIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  )
}
