'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createInvite, revokeInvite } from '@/lib/actions/invites'

export interface InviteRow {
  id: string
  token: string
  expiresAt: string
  createdAt: string
}

interface Props {
  invites: InviteRow[]
  workspaceId: string
  canManage: boolean // owner or dm
}

export default function InvitePanel({ invites, workspaceId, canManage }: Props) {
  const router = useRouter()
  const [creating, startCreate] = useTransition()
  const [revoking, startRevoke] = useTransition()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  function handleCreate() {
    setCreateError(null)
    startCreate(async () => {
      const result = await createInvite(workspaceId)
      if (result.error) {
        setCreateError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleRevoke(inviteId: string) {
    startRevoke(async () => {
      await revokeInvite(workspaceId, inviteId)
      router.refresh()
    })
  }

  function handleCopy(token: string, id: string) {
    const url = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  return (
    <div className="px-6 py-5 border-t border-[#2a3347]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-medium text-gray-300">Invite links</h2>
          <p className="text-xs text-gray-600 mt-0.5">Links expire after 7 days and are single-use.</p>
        </div>
        {canManage && (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
          >
            <PlusIcon />
            {creating ? 'Creating…' : 'New invite'}
          </button>
        )}
      </div>

      {createError && (
        <p className="mb-2 text-xs text-red-400">{createError}</p>
      )}

      {invites.length === 0 ? (
        <p className="text-xs text-gray-600 py-2">No active invite links.</p>
      ) : (
        <ul className="space-y-2">
          {invites.map((invite) => {
            const url = `/invite/${invite.token}`
            const expires = new Date(invite.expiresAt)
            const daysLeft = Math.ceil(
              (expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
            const isCopied = copiedId === invite.id

            return (
              <li
                key={invite.id}
                className="flex items-center gap-2 rounded-lg bg-[#1c2333] border border-[#2a3347] px-3 py-2"
              >
                {/* URL preview */}
                <span className="flex-1 min-w-0 text-xs font-mono text-gray-400 truncate">
                  …{url}
                </span>

                {/* Expiry */}
                <span className="text-xs text-gray-600 flex-shrink-0 tabular-nums">
                  {daysLeft}d left
                </span>

                {/* Copy */}
                <button
                  onClick={() => handleCopy(invite.token, invite.id)}
                  title="Copy link"
                  className="p-1 rounded-md text-gray-500 hover:text-indigo-400 hover:bg-indigo-400/10 transition-colors flex-shrink-0"
                >
                  {isCopied ? <CheckIcon /> : <CopyIcon />}
                </button>

                {/* Revoke */}
                {canManage && (
                  <button
                    onClick={() => handleRevoke(invite.id)}
                    disabled={revoking}
                    title="Revoke invite"
                    className="p-1 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    <XIcon />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function PlusIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
      <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  )
}
