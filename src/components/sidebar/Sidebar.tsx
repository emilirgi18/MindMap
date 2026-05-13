'use client'

import { useState } from 'react'

function MindMapLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="20" cy="20" r="5.5" fill="#f97316" />
      <circle cx="7"  cy="8"  r="3" fill="#f97316" opacity="0.5" />
      <circle cx="33" cy="8"  r="3" fill="#f97316" opacity="0.5" />
      <circle cx="7"  cy="32" r="3" fill="#f97316" opacity="0.5" />
      <circle cx="33" cy="32" r="3" fill="#f97316" opacity="0.5" />
      <line x1="15.1" y1="16.4" x2="9.5"  y2="10.3" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <line x1="24.9" y1="16.4" x2="30.5" y2="10.3" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <line x1="15.1" y1="23.6" x2="9.5"  y2="29.7" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <line x1="24.9" y1="23.6" x2="30.5" y2="29.7" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

function KanbanIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <rect x="2" y="3" width="4" height="14" rx="1" />
      <rect x="8" y="3" width="4" height="9" rx="1" />
      <rect x="14" y="3" width="4" height="11" rx="1" />
    </svg>
  )
}

function TimelineIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <circle cx="10" cy="4" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="10" cy="16" r="1.5" />
      <line x1="10" y1="5.5" x2="10" y2="8.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10" y1="11.5" x2="10" y2="14.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="4" x2="18" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="16" x2="17" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import NoteTree from './NoteTree'
import NewWorkspaceModal from './NewWorkspaceModal'
import { useAppStore } from '@/store'
import { signOut } from '@/lib/actions/auth'
import type { WorkspaceWithRole, NoteListItem, FolderItem, UserProfile, KanbanColumnItem } from '@/lib/types'

interface Props {
  workspaces: WorkspaceWithRole[]
  notes: NoteListItem[]
  folders: FolderItem[]
  kanbanColumns: KanbanColumnItem[]
  currentWorkspaceId: string
  currentRole: WorkspaceWithRole['role']
  profile: UserProfile
  isAdmin?: boolean
}

export default function Sidebar({
  workspaces, notes, folders, kanbanColumns,
  currentWorkspaceId, currentRole, profile, isAdmin,
}: Props) {
  const [showNewWorkspace, setShowNewWorkspace] = useState(false)
  const { sidebarOpen, toggleSidebar } = useAppStore()
  const pathname = usePathname()
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId)
  const isCampaign = currentWorkspace?.type === 'campaign'
  const graphHref    = `/workspace/${currentWorkspaceId}/graph`
  const membersHref  = `/workspace/${currentWorkspaceId}/members`
  const kanbanHref   = `/workspace/${currentWorkspaceId}/kanban`
  const timelineHref = `/workspace/${currentWorkspaceId}/timeline`
  const isGraph    = pathname === graphHref
  const isMembers  = pathname === membersHref
  const isKanban   = pathname === kanbanHref
  const isTimeline = pathname === timelineHref

  void kanbanColumns

  const navItem = (active: boolean) =>
    `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors ${
      active
        ? 'bg-orange-500/15 text-orange-400'
        : 'text-slate-500 hover:text-slate-100 hover:bg-slate-700/40'
    }`

  if (!sidebarOpen) {
    return (
      <aside className="flex flex-col items-center gap-1 py-3 w-10 flex-shrink-0 bg-[#1e293b] border-r border-[#334155]">
        <button
          onClick={toggleSidebar}
          title="Open sidebar"
          className="p-1.5 rounded-md hover:bg-slate-700/40 text-slate-600 hover:text-orange-400 transition-colors"
        >
          <ChevronRightIcon />
        </button>
      </aside>
    )
  }

  const avatarChar = (profile.full_name ?? profile.email)?.[0]?.toUpperCase() ?? '?'

  return (
    <>
      <aside className="flex flex-col w-64 flex-shrink-0 bg-[#1e293b] border-r border-[#334155] overflow-hidden">
        {/* App header */}
        <div className="flex items-center justify-between px-3 h-12 border-b border-[#334155] flex-shrink-0">
          <div className="flex items-center gap-2.5 select-none">
            <MindMapLogo />
            <span className="text-base font-bold text-white tracking-tight">MindMap</span>
          </div>
          <button
            onClick={toggleSidebar}
            title="Close sidebar"
            className="p-1 rounded-md hover:bg-slate-700/40 text-slate-600 hover:text-orange-400 transition-colors"
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

        {/* Nav links */}
        <div className="px-2 pt-1.5 pb-1 flex-shrink-0 flex flex-col gap-0.5">
          <Link href={graphHref}    className={navItem(isGraph)}>   <GraphIcon />   Graph view  </Link>
          {isCampaign && (
            <Link href={membersHref} className={navItem(isMembers)}> <PeopleIcon />  Members     </Link>
          )}
          <Link href={kanbanHref}   className={navItem(isKanban)}>  <KanbanIcon />  Kanban      </Link>
          <Link href={timelineHref} className={navItem(isTimeline)}> <TimelineIcon />Timeline    </Link>
        </div>

        <div className="mx-3 border-t border-[#334155]/60" />

        {/* Note list */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <NoteTree notes={notes} folders={folders} workspaceId={currentWorkspaceId} currentRole={currentRole} />
        </div>

        {/* Admin link */}
        {isAdmin && (
          <div className="px-2 py-1.5 border-t border-[#334155] flex-shrink-0">
            <Link
              href="/admin/users"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-slate-500 hover:text-slate-100 hover:bg-slate-700/40 transition-colors"
            >
              <AdminIcon />
              Admin panel
            </Link>
          </div>
        )}

        {/* User footer */}
        <div className="px-3 py-3 border-t border-[#334155] flex items-center gap-2.5 flex-shrink-0">
          <div className="h-7 w-7 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-sm font-semibold text-orange-400 flex-shrink-0 select-none">
            {avatarChar}
          </div>
          <span className="text-sm text-slate-400 truncate flex-1 min-w-0">
            {profile.full_name ?? profile.email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              title="Sign out"
              className="p-1 rounded-md text-slate-600 hover:text-orange-400 hover:bg-slate-700/40 transition-colors flex-shrink-0"
            >
              <SignOutIcon />
            </button>
          </form>
        </div>
      </aside>

      {showNewWorkspace && <NewWorkspaceModal onClose={() => setShowNewWorkspace(false)} />}
    </>
  )
}

function PeopleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 17a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  )
}

function GraphIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <circle cx="10" cy="4" r="2" /><circle cx="3" cy="16" r="2" /><circle cx="17" cy="16" r="2" />
      <line x1="10" y1="6" x2="3"  y2="14" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10" y1="6" x2="17" y2="14" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5"  y1="16" x2="15" y2="16" stroke="currentColor" strokeWidth="1.5" />
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

function AdminIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.5.5 0 01.479.425c.069.52.104 1.05.104 1.589 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 01-.332 0C5.26 16.563 2 12.162 2 7c0-.538.035-1.069.104-1.589a.5.5 0 01.48-.425 11.947 11.947 0 007.077-2.749z" clipRule="evenodd" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z" clipRule="evenodd" />
    </svg>
  )
}
