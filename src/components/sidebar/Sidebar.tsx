'use client'

import NoteTree from './NoteTree'
import { useAppStore } from '@/store'
import type { WorkspaceWithRole, NoteListItem, FolderItem } from '@/lib/types'

interface Props {
  notes: NoteListItem[]
  folders: FolderItem[]
  workspaceId: string
  currentRole: WorkspaceWithRole['role']
}

export default function Sidebar({ notes, folders, workspaceId, currentRole }: Props) {
  const { sidebarOpen, toggleSidebar } = useAppStore()

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

  return (
    <aside className="flex flex-col w-72 flex-shrink-0 bg-[#1e293b] border-r border-[#334155] overflow-hidden">
      <div className="flex items-center justify-between px-3 h-10 border-b border-[#334155] flex-shrink-0">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Notes</span>
        <button
          onClick={toggleSidebar}
          title="Close sidebar"
          className="p-1 rounded-md hover:bg-slate-700/40 text-slate-600 hover:text-orange-400 transition-colors"
        >
          <ChevronLeftIcon />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <NoteTree notes={notes} folders={folders} workspaceId={workspaceId} currentRole={currentRole} />
      </div>
    </aside>
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
