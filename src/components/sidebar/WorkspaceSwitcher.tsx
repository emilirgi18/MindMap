'use client'

import Link from 'next/link'
import type { WorkspaceWithRole } from '@/lib/types'

interface Props {
  workspaces: WorkspaceWithRole[]
  currentWorkspaceId: string
  onNewCampaign: () => void
}

export default function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
  onNewCampaign,
}: Props) {
  const personal = workspaces.find((w) => w.type === 'personal')
  const campaigns = workspaces.filter((w) => w.type === 'campaign')

  return (
    <div className="px-2 py-2 border-b border-[#2a3347] space-y-0.5">
      {personal && (
        <WorkspaceRow
          workspace={personal}
          isActive={personal.id === currentWorkspaceId}
        />
      )}

      {campaigns.length > 0 && (
        <>
          <p className="px-2 pt-2 pb-0.5 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
            Campaigns
          </p>
          {campaigns.map((ws) => (
            <WorkspaceRow
              key={ws.id}
              workspace={ws}
              isActive={ws.id === currentWorkspaceId}
            />
          ))}
        </>
      )}

      <button
        onClick={onNewCampaign}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-gray-500 hover:text-gray-300 hover:bg-[#1c2333] transition-colors"
      >
        <PlusIcon className="h-3.5 w-3.5 flex-shrink-0" />
        New campaign
      </button>
    </div>
  )
}

function WorkspaceRow({
  workspace,
  isActive,
}: {
  workspace: WorkspaceWithRole
  isActive: boolean
}) {
  return (
    <Link
      href={`/workspace/${workspace.id}`}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
        isActive
          ? 'bg-[#1c2333] text-white'
          : 'text-gray-400 hover:text-gray-200 hover:bg-[#1c2333]'
      }`}
    >
      {workspace.type === 'personal' ? (
        <HomeIcon className="h-3.5 w-3.5 flex-shrink-0 text-indigo-400" />
      ) : (
        <BookIcon className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
      )}
      <span className="truncate flex-1">{workspace.name}</span>
      {workspace.role === 'dm' && (
        <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide">
          DM
        </span>
      )}
    </Link>
  )
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  )
}
