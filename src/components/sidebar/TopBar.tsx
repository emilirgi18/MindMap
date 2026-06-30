'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import NewWorkspaceModal from './NewWorkspaceModal'
import { signOut } from '@/lib/actions/auth'
import type { WorkspaceWithRole, UserProfile } from '@/lib/types'

function MindMapLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
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

interface Props {
  workspaces: WorkspaceWithRole[]
  currentWorkspaceId: string
  currentRole: WorkspaceWithRole['role']
  profile: UserProfile
  isAdmin?: boolean
}

export default function TopBar({ workspaces, currentWorkspaceId, currentRole, profile, isAdmin }: Props) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNewWorkspace, setShowNewWorkspace] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const [navPending, startNavTransition] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId)
  const isCampaign = currentWorkspace?.type === 'campaign'
  const personal = workspaces.find((w) => w.type === 'personal')
  const campaigns = workspaces.filter((w) => w.type === 'campaign')

  const graphHref    = `/workspace/${currentWorkspaceId}/graph`
  const membersHref  = `/workspace/${currentWorkspaceId}/members`
  const kanbanHref   = `/workspace/${currentWorkspaceId}/kanban`
  const timelineHref = `/workspace/${currentWorkspaceId}/timeline`

  const isGraph    = pathname === graphHref
  const isMembers  = pathname === membersHref
  const isKanban   = pathname === kanbanHref
  const isTimeline = pathname === timelineHref

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  function navTo(href: string) {
    setPendingHref(href)
    startNavTransition(() => { router.push(href); setPendingHref(null) })
  }

  const navItem = (active: boolean, pending: boolean) =>
    `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
      active || pending
        ? 'bg-orange-500/15 text-orange-400'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/40'
    }`

  const avatarChar = (profile.full_name ?? profile.email)?.[0]?.toUpperCase() ?? '?'

  return (
    <>
      <header className="h-12 flex items-center gap-3 px-4 border-b border-[#334155] bg-[#1e293b] flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 select-none flex-shrink-0">
          <MindMapLogo />
          <span className="text-base font-bold text-white tracking-tight">MindMap</span>
        </div>

        <div className="w-px h-5 bg-[#334155] flex-shrink-0" />

        {/* Workspace dropdown */}
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-700/40 transition-colors"
          >
            {currentWorkspace?.type === 'personal' ? (
              <HomeIcon className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
            ) : (
              <BookIcon className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
            )}
            <span className="max-w-[160px] truncate">{currentWorkspace?.name ?? 'Workspace'}</span>
            <ChevronDownIcon className={`h-3.5 w-3.5 text-slate-500 transition-transform flex-shrink-0 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-[#334155] bg-[#1e293b] shadow-xl z-50 py-1">
              {personal && (
                <Link
                  href={`/workspace/${personal.id}`}
                  onClick={() => setShowDropdown(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    personal.id === currentWorkspaceId
                      ? 'text-white bg-slate-700/50'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                  }`}
                >
                  <HomeIcon className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                  <span className="truncate flex-1">{personal.name}</span>
                </Link>
              )}

              {campaigns.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                    Campaigns
                  </p>
                  {campaigns.map((ws) => (
                    <Link
                      key={ws.id}
                      href={`/workspace/${ws.id}`}
                      onClick={() => setShowDropdown(false)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        ws.id === currentWorkspaceId
                          ? 'text-white bg-slate-700/50'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                      }`}
                    >
                      <BookIcon className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                      <span className="truncate flex-1">{ws.name}</span>
                      {ws.role === 'dm' && (
                        <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wide">DM</span>
                      )}
                    </Link>
                  ))}
                </>
              )}

              <div className="my-1 border-t border-[#334155]" />
              <button
                onClick={() => { setShowDropdown(false); setShowNewWorkspace(true) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-700/40 transition-colors"
              >
                <PlusIcon className="h-3.5 w-3.5 flex-shrink-0" />
                New campaign
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-[#334155] flex-shrink-0" />

        {/* Nav links */}
        <nav className="flex items-center gap-0.5">
          <button onClick={() => navTo(graphHref)}    className={navItem(isGraph,    pendingHref === graphHref    && navPending)}>
            <GraphIcon />Graph
          </button>
          {isCampaign && (
            <button onClick={() => navTo(membersHref)} className={navItem(isMembers, pendingHref === membersHref  && navPending)}>
              <PeopleIcon />Members
            </button>
          )}
          <button onClick={() => navTo(kanbanHref)}   className={navItem(isKanban,   pendingHref === kanbanHref   && navPending)}>
            <KanbanIcon />Kanban
          </button>
          <button onClick={() => navTo(timelineHref)} className={navItem(isTimeline, pendingHref === timelineHref && navPending)}>
            <TimelineIcon />Timeline
          </button>
        </nav>

        <div className="flex-1" />

        {/* Admin link */}
        {isAdmin && (
          <Link
            href="/admin/users"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:text-slate-100 hover:bg-slate-700/40 transition-colors"
          >
            <AdminIcon />
            Admin
          </Link>
        )}

        {/* User + sign out */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="h-7 w-7 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-sm font-semibold text-orange-400 select-none">
            {avatarChar}
          </div>
          <span className="text-sm text-slate-400 max-w-[120px] truncate hidden sm:block">
            {profile.full_name ?? profile.email}
          </span>
          {isCampaign && currentRole !== 'player' && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded hidden sm:block">
              {currentRole === 'owner' ? 'Owner' : 'DM'}
            </span>
          )}
          <form action={signOut}>
            <button
              type="submit"
              title="Sign out"
              className="p-1.5 rounded-md text-slate-600 hover:text-orange-400 hover:bg-slate-700/40 transition-colors"
            >
              <SignOutIcon />
            </button>
          </form>
        </div>
      </header>

      {showNewWorkspace && <NewWorkspaceModal onClose={() => setShowNewWorkspace(false)} />}
    </>
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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
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

function PeopleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 17a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
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
