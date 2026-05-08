'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition, useState } from 'react'
import { createNote } from '@/lib/actions/notes'
import type { NoteListItem, WorkspaceRole } from '@/lib/types'

export type { NoteListItem }

interface Props {
  notes: NoteListItem[]
  workspaceId: string
  currentRole: WorkspaceRole
}

export default function NoteTree({ notes, workspaceId, currentRole }: Props) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const canSeeLock = currentRole === 'owner' || currentRole === 'dm'

  const filtered = query.trim()
    ? notes.filter((n) =>
        (n.title || 'Untitled').toLowerCase().includes(query.toLowerCase())
      )
    : notes

  function handleNewNote() {
    startTransition(async () => {
      await createNote(workspaceId)
    })
  }

  return (
    <div className="p-2">
      <div className="flex items-center justify-between px-2 py-1 mb-1">
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
          Notes
        </span>
        <button
          onClick={handleNewNote}
          disabled={isPending}
          title="New note"
          className="p-0.5 rounded hover:bg-[#1c2333] text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-2 mb-1.5">
        <div className="relative">
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-600 pointer-events-none"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="w-full bg-[#1c2333] rounded-md pl-6 pr-2 py-1 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
            >
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="px-2 py-6 text-center">
          <p className="text-xs text-gray-600">No notes yet.</p>
          <button onClick={handleNewNote} className="mt-1 text-xs text-indigo-400 hover:underline">
            Create the first one
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-2 py-3 text-xs text-gray-600 text-center">No notes match.</p>
      ) : (
        <ul className="space-y-px">
          {filtered.map((note) => {
            const href = `/workspace/${workspaceId}/note/${note.id}`
            const isActive = pathname === href || pathname.startsWith(href)
            return (
              <li key={note.id}>
                <Link
                  href={href}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-200'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#1c2333]'
                  }`}
                >
                  {canSeeLock && note.dm_only && (
                    <svg className="h-3 w-3 flex-shrink-0 text-amber-400" viewBox="0 0 20 20" fill="currentColor" aria-label="DM only">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="truncate">{note.title || 'Untitled'}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
