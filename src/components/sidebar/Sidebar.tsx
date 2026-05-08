'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import NoteTree from './NoteTree'
import NewWorkspaceModal from './NewWorkspaceModal'
import { useAppStore } from '@/store'
import type { WorkspaceWithRole, NoteListItem, UserProfile } from '@/lib/types'

interface Props {
  workspaces: WorkspaceWithRole[]
  notes: NoteListItem[]
  currentWorkspaceId: string
  currentRole: WorkspaceWithRole['role']
  profile: UserProfile
}

export default function Sidebar({
  workspaces,
  notes,
  currentWorkspaceId,
  currentRole,
  profile,
}: Props) {
  const [showNewWorkspace, setShowNewWorkspace] = useState(false)
  const { sidebarOpen, toggleSidebar } = useAppStore()
  const pathname = usePathname()
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId)
  const isCampaign = currentWorkspace?.type === 'campaign'
  const graphHref = `/workspace/${currentWorkspaceId}/graph`
  const membersHref = `/workspace/${currentWorkspaceId}/members`
  const isGraph = pathname === graphHref
  const isMembers = pathname === membersHref

  if (!sidebarOpen) {
    return (
      <aside className="flex flex-col items-center gap-1 py-3 w-10 flex-shrink-0 bg-[#161b27] border-r border-[#2a3347]">
        <button
          onClick={toggleSidebar}
          title="Open sidebar"
          className="p-1.5 rounded-md hover:bg-[#1c2333] text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ChevronRightIcon />
        </button>
      </aside>
    )
  }

  const avatarChar = (profile.full_name ?? profile.email)?.[0]?.toUpperCase() ?? '?'

  return (
    <>
      <aside className="flex flex-col w-60 flex-shrink-0 bg-[#161b27] border-r border-[#2a3347] overflow-hidden">
        {/* App header */}
        <div className="flex items-center justify-between px-3 h-11 border-b border-[#2a3347] flex-shrink-0">
          <span className="text-sm font-semibold text-white tracking-tight select-none">
            MindMap
          </span>
          <button
            onClick={toggleSidebar}
            title="Close sidebar"
            className="p-1 rounded-md hover:bg-[#1c2333] text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ChevronLeftIcon />
          </button>
        </div>

        {/* Workspace switcher */}
        <WorkspaceSwitcher
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          onNewCampaign={() => setShowNewWorkspace(true)}
        />

        {/* Graph + Members links */}
        <div className="px-2 pt-1 pb-0.5 flex-shrink-0 flex flex-col gap-0.5">
          <Link
            href={graphHref}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isGraph
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#1c2333]'
            }`}
          >
            <GraphIcon />
            Graph view
          </Link>
          {isCampaign && (
            <Link
              href={membersHref}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isMembers
                  ? 'bg-indigo-600/20 text-indigo-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#1c2333]'
              }`}
            >
              <PeopleIcon />
              Members
            </Link>
          )}
        </div>

        {/* Note list — scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <NoteTree
            notes={notes}
            workspaceId={currentWorkspaceId}
            currentRole={currentRole}
          />
        </div>

        {/* User footer */}
        <div className="px-3 py-2.5 border-t border-[#2a3347] flex items-center gap-2 flex-shrink-0">
          <div className="h-6 w-6 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-medium text-white flex-shrink-0 select-none">
            {avatarChar}
          </div>
          <span className="text-xs text-gray-400 truncate">
            {profile.full_name ?? profile.email}
          </span>
        </div>
      </aside>

      {showNewWorkspace && (
        <NewWorkspaceModal onClose={() => setShowNewWorkspace(false)} />
      )}
    </>
  )
}

function PeopleIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 17a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  )
}

function GraphIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <circle cx="10" cy="4" r="2" />
      <circle cx="3" cy="16" r="2" />
      <circle cx="17" cy="16" r="2" />
      <line x1="10" y1="6" x2="3" y2="14" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10" y1="6" x2="17" y2="14" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5" y1="16" x2="15" y2="16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  )
}
