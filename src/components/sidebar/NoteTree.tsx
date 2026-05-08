'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTransition, useState, useRef, useEffect } from 'react'
import { createNote, deleteNote, setNoteFolder } from '@/lib/actions/notes'
import { createFolder, deleteFolder, renameFolder } from '@/lib/actions/folders'
import type { NoteListItem, FolderItem, WorkspaceRole } from '@/lib/types'

export type { NoteListItem }

interface Props {
  notes: NoteListItem[]
  folders: FolderItem[]
  workspaceId: string
  currentRole: WorkspaceRole
}

export default function NoteTree({ notes, folders, workspaceId, currentRole }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set(folders.map((f) => f.id)))
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [folderName, setFolderName] = useState('')
  const [movingNote, setMovingNote] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const canManage = currentRole === 'owner' || currentRole === 'dm'
  const canSeeLock = canManage

  // Auto-open any new folder
  useEffect(() => {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      folders.forEach((f) => next.add(f.id))
      return next
    })
  }, [folders])

  // Focus rename input when it appears
  useEffect(() => {
    if (editingFolder) editInputRef.current?.focus()
  }, [editingFolder])

  const filteredNotes = query.trim()
    ? notes.filter((n) => (n.title || 'Untitled').toLowerCase().includes(query.toLowerCase()))
    : null

  function toggleFolder(id: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleNewNote(folderId?: string) {
    startTransition(async () => {
      await createNote(workspaceId, folderId)
    })
  }

  function handleDeleteNote(noteId: string) {
    startTransition(async () => {
      await deleteNote(noteId, workspaceId)
    })
  }

  function handleNewFolder() {
    startTransition(async () => {
      await createFolder(workspaceId)
    })
  }

  function handleDeleteFolder(folderId: string) {
    startTransition(async () => {
      await deleteFolder(folderId, workspaceId)
      router.refresh()
    })
  }

  function startRenameFolder(folder: FolderItem) {
    setFolderName(folder.name)
    setEditingFolder(folder.id)
  }

  function commitRename(folderId: string) {
    const name = folderName.trim()
    setEditingFolder(null)
    if (!name) return
    startTransition(async () => {
      await renameFolder(folderId, workspaceId, name)
      router.refresh()
    })
  }

  function handleMoveNote(noteId: string, folderId: string | null) {
    setMovingNote(null)
    startTransition(async () => {
      await setNoteFolder(noteId, workspaceId, folderId)
      router.refresh()
    })
  }

  const notesInFolder = (folderId: string) => notes.filter((n) => n.folder_id === folderId)
  const rootNotes = notes.filter((n) => n.folder_id === null)

  // ---- render helpers -------------------------------------------------------

  function NoteItem({ note }: { note: NoteListItem }) {
    const href = `/workspace/${workspaceId}/note/${note.id}`
    const isActive = pathname === href || pathname.startsWith(href + '/')
    const isMoving = movingNote === note.id

    return (
      <li key={note.id} className="relative group/note">
        <div className={`flex items-center gap-1 rounded-md transition-colors ${isActive ? 'bg-indigo-600/20' : 'hover:bg-[#1c2333]'}`}>
          <Link
            href={href}
            className={`flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1.5 text-sm ${isActive ? 'text-indigo-200' : 'text-gray-400 group-hover/note:text-gray-200'}`}
          >
            {canSeeLock && note.dm_only && (
              <svg className="h-3 w-3 flex-shrink-0 text-amber-400" viewBox="0 0 20 20" fill="currentColor" aria-label="DM only">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            )}
            <span className="truncate">{note.title || 'Untitled'}</span>
          </Link>

          {/* Hover actions */}
          <div className="flex items-center pr-1 opacity-0 group-hover/note:opacity-100 transition-opacity flex-shrink-0">
            {/* Move to folder */}
            {folders.length > 0 && (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setMovingNote(isMoving ? null : note.id) }}
                  title="Move to folder"
                  className="p-0.5 rounded text-gray-600 hover:text-gray-300 hover:bg-[#2a3347]"
                >
                  <FolderMoveIcon />
                </button>
                {isMoving && (
                  <div className="absolute right-0 top-full mt-0.5 z-50 w-36 rounded-md bg-[#1c2333] border border-[#2a3347] shadow-lg py-1 text-xs">
                    {note.folder_id !== null && (
                      <button
                        onClick={() => handleMoveNote(note.id, null)}
                        className="w-full text-left px-3 py-1.5 text-gray-400 hover:bg-[#2a3347] hover:text-gray-200"
                      >
                        No folder
                      </button>
                    )}
                    {folders.filter((f) => f.id !== note.folder_id).map((f) => (
                      <button
                        key={f.id}
                        onClick={() => handleMoveNote(note.id, f.id)}
                        className="w-full text-left px-3 py-1.5 text-gray-400 hover:bg-[#2a3347] hover:text-gray-200 truncate"
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Delete */}
            <button
              onClick={() => handleDeleteNote(note.id)}
              title="Delete note"
              className="p-0.5 rounded text-gray-600 hover:text-red-400 hover:bg-[#2a3347]"
            >
              <XSmallIcon />
            </button>
          </div>
        </div>
      </li>
    )
  }

  // ---- main render ----------------------------------------------------------

  return (
    <div className="p-2" onClick={() => setMovingNote(null)}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 mb-1">
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Notes</span>
        <div className="flex items-center gap-0.5">
          {canManage && (
            <button
              onClick={(e) => { e.stopPropagation(); handleNewFolder() }}
              disabled={isPending}
              title="New folder"
              className="p-0.5 rounded hover:bg-[#1c2333] text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
            >
              <FolderPlusIcon />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleNewNote() }}
            disabled={isPending}
            title="New note"
            className="p-0.5 rounded hover:bg-[#1c2333] text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 mb-1.5">
        <div className="relative">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-600 pointer-events-none" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
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
            <button onClick={() => setQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
              <XSmallIcon />
            </button>
          )}
        </div>
      </div>

      {/* Search results (flat list) */}
      {filteredNotes ? (
        filteredNotes.length === 0 ? (
          <p className="px-2 py-3 text-xs text-gray-600 text-center">No notes match.</p>
        ) : (
          <ul className="space-y-px">
            {filteredNotes.map((note) => <NoteItem key={note.id} note={note} />)}
          </ul>
        )
      ) : notes.length === 0 ? (
        <div className="px-2 py-6 text-center">
          <p className="text-xs text-gray-600">No notes yet.</p>
          <button onClick={() => handleNewNote()} className="mt-1 text-xs text-indigo-400 hover:underline">
            Create the first one
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Folders */}
          {folders.map((folder) => {
            const isOpen = openFolders.has(folder.id)
            const folderNotes = notesInFolder(folder.id)
            const isEditing = editingFolder === folder.id

            return (
              <div key={folder.id}>
                <div className="flex items-center gap-1 group/folder rounded-md hover:bg-[#1c2333] px-1 py-1">
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="text-gray-600 hover:text-gray-300 flex-shrink-0"
                  >
                    <ChevronIcon open={isOpen} />
                  </button>

                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      onBlur={() => commitRename(folder.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(folder.id)
                        if (e.key === 'Escape') setEditingFolder(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-[#2a3347] text-xs text-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <button
                      onDoubleClick={() => startRenameFolder(folder)}
                      className="flex-1 min-w-0 text-left text-xs font-medium text-gray-400 truncate"
                    >
                      {folder.name}
                    </button>
                  )}

                  <div className="flex items-center gap-0.5 opacity-0 group-hover/folder:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNewNote(folder.id) }}
                      title="New note in folder"
                      className="p-0.5 rounded text-gray-600 hover:text-gray-300 hover:bg-[#2a3347]"
                    >
                      <PlusIcon />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }}
                      title="Delete folder"
                      className="p-0.5 rounded text-gray-600 hover:text-red-400 hover:bg-[#2a3347]"
                    >
                      <XSmallIcon />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <ul className="ml-3 border-l border-[#2a3347] pl-1 space-y-px mt-px">
                    {folderNotes.length === 0 ? (
                      <li className="px-2 py-1 text-xs text-gray-700 italic">Empty</li>
                    ) : (
                      folderNotes.map((note) => <NoteItem key={note.id} note={note} />)
                    )}
                  </ul>
                )}
              </div>
            )
          })}

          {/* Root notes */}
          {rootNotes.length > 0 && (
            <ul className="space-y-px">
              {rootNotes.map((note) => <NoteItem key={note.id} note={note} />)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// Icons -----------------------------------------------------------------------

function PlusIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  )
}

function XSmallIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  )
}

function FolderPlusIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M2 4.75A2.75 2.75 0 014.75 2h3.215a2.75 2.75 0 011.985.841l.208.22H15.25A2.75 2.75 0 0118 5.75v.536A2.75 2.75 0 0118 7v7.25A2.75 2.75 0 0115.25 17H4.75A2.75 2.75 0 012 14.25V4.75z" opacity=".4"/>
      <path fillRule="evenodd" d="M10 8a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 0110 8z" clipRule="evenodd" />
    </svg>
  )
}

function FolderMoveIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M2 4.75A2.75 2.75 0 014.75 2h3.215a2.75 2.75 0 011.985.841l.208.22H15.25A2.75 2.75 0 0118 5.75v8.5A2.75 2.75 0 0115.25 17H4.75A2.75 2.75 0 012 14.25V4.75z" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  )
}
