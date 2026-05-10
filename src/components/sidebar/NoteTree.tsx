'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTransition, useState, useRef, useEffect } from 'react'
import { createNote, deleteNote, setNoteFolder } from '@/lib/actions/notes'
import { createFolder, createSubfolder, deleteFolder, renameFolder, setFolderParent } from '@/lib/actions/folders'
import type { NoteListItem, FolderItem, WorkspaceRole } from '@/lib/types'

export type { NoteListItem }

interface Props {
  notes: NoteListItem[]
  folders: FolderItem[]
  workspaceId: string
  currentRole: WorkspaceRole
}

interface FolderNode extends FolderItem {
  children: FolderNode[]
  notes: NoteListItem[]
}

type DragItem = { type: 'note'; id: string } | { type: 'folder'; id: string }
// '__root__' = drop into no folder (root level)
type DropTarget = string | '__root__'

function buildTree(folders: FolderItem[], notes: NoteListItem[], parentId: string | null = null): FolderNode[] {
  return folders
    .filter((f) => (f.parent_id ?? null) === parentId)
    .map((f) => ({
      ...f,
      children: buildTree(folders, notes, f.id),
      notes: notes.filter((n) => n.folder_id === f.id),
    }))
}

// True if potentialAncestorId is a strict ancestor of folderId in the folder tree
function isAncestorOf(folders: FolderItem[], potentialAncestorId: string, folderId: string): boolean {
  let f = folders.find((x) => x.id === folderId)
  while (f && f.parent_id) {
    if (f.parent_id === potentialAncestorId) return true
    f = folders.find((x) => x.id === f!.parent_id)
  }
  return false
}

// ---------------------------------------------------------------------------

interface NoteRowProps {
  note: NoteListItem
  workspaceId: string
  folders: FolderItem[]
  pathname: string
  canSeeLock: boolean
  movingNote: string | null
  confirming: { type: 'note' | 'folder'; id: string } | null
  matchedTags?: string[]
  dragItem: DragItem | null
  onDragStart: (item: DragItem) => void
  onDragEnd: () => void
  onSetMoving: (id: string | null) => void
  onDeleteNote: (id: string) => void
  onMoveNote: (noteId: string, folderId: string | null) => void
  onConfirm: (item: { type: 'note' | 'folder'; id: string } | null) => void
}

function NoteRow({
  note, workspaceId, folders, pathname, canSeeLock,
  movingNote, confirming, matchedTags, dragItem, onDragStart, onDragEnd,
  onSetMoving, onDeleteNote, onMoveNote, onConfirm,
}: NoteRowProps) {
  const href = `/workspace/${workspaceId}/note/${note.id}`
  const isActive = pathname === href || pathname.startsWith(href + '/')
  const isMoving = movingNote === note.id
  const isConfirming = confirming?.type === 'note' && confirming.id === note.id
  const isDragging = dragItem?.type === 'note' && dragItem.id === note.id

  return (
    <li
      className={`relative group/note transition-opacity ${isDragging ? 'opacity-40' : ''}`}
      draggable
      onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; onDragStart({ type: 'note', id: note.id }) }}
      onDragEnd={onDragEnd}
    >
      <div className={`flex items-center rounded-md transition-colors ${isActive ? 'bg-indigo-600/20' : 'hover:bg-[#1c2333]'}`}>
        <Link
          href={href}
          draggable={false}
          className={`flex-1 min-w-0 flex flex-col px-2 py-1.5 text-sm ${isActive ? 'text-indigo-200' : 'text-gray-400 group-hover/note:text-gray-200'}`}
        >
          <span className="flex items-center gap-1.5">
            {canSeeLock && note.dm_only && (
              <svg className="h-3 w-3 flex-shrink-0 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            )}
            <span className="truncate">{note.title || 'Untitled'}</span>
          </span>
          {matchedTags && matchedTags.length > 0 && (
            <span className="flex flex-wrap gap-1 mt-0.5">
              {matchedTags.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-px rounded-full bg-emerald-600/15 border border-emerald-500/20 text-emerald-400">{t}</span>
              ))}
            </span>
          )}
        </Link>

        {isConfirming ? (
          <div className="flex items-center gap-1 pr-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] text-gray-500">Delete?</span>
            <button onClick={() => onDeleteNote(note.id)} className="text-[10px] px-1 rounded bg-red-600/80 hover:bg-red-600 text-white">Yes</button>
            <button onClick={() => onConfirm(null)} className="text-[10px] px-1 rounded bg-[#2a3347] hover:bg-[#333f57] text-gray-300">No</button>
          </div>
        ) : (
          <div className="flex items-center pr-1 opacity-0 group-hover/note:opacity-100 transition-opacity flex-shrink-0">
            {folders.length > 0 && (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); onSetMoving(isMoving ? null : note.id) }}
                  title="Move to folder"
                  className="p-0.5 rounded text-gray-600 hover:text-gray-300 hover:bg-[#2a3347]"
                >
                  <FolderMoveIcon />
                </button>
                {isMoving && (
                  <div className="absolute right-0 top-full mt-0.5 z-50 w-36 rounded-md bg-[#1c2333] border border-[#2a3347] shadow-lg py-1 text-xs">
                    {note.folder_id !== null && (
                      <button onClick={() => onMoveNote(note.id, null)} className="w-full text-left px-3 py-1.5 text-gray-400 hover:bg-[#2a3347] hover:text-gray-200">
                        No folder
                      </button>
                    )}
                    {folders.filter((f) => f.id !== note.folder_id).map((f) => (
                      <button key={f.id} onClick={() => onMoveNote(note.id, f.id)} className="w-full text-left px-3 py-1.5 text-gray-400 hover:bg-[#2a3347] hover:text-gray-200 truncate">
                        {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onConfirm({ type: 'note', id: note.id }) }}
              title="Delete note"
              className="p-0.5 rounded text-gray-600 hover:text-red-400 hover:bg-[#2a3347]"
            >
              <XSmallIcon />
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------

interface FolderRowProps {
  node: FolderNode
  depth: number
  workspaceId: string
  folders: FolderItem[]
  pathname: string
  canSeeLock: boolean
  canManage: boolean
  openFolders: Set<string>
  movingNote: string | null
  confirming: { type: 'note' | 'folder'; id: string } | null
  editingFolder: string | null
  folderName: string
  editInputRef: React.RefObject<HTMLInputElement>
  dragItem: DragItem | null
  dropTarget: DropTarget | null
  onToggle: (id: string) => void
  onNewNote: (folderId: string) => void
  onNewSubfolder: (parentId: string) => void
  onDeleteFolder: (id: string) => void
  onStartRename: (folder: FolderItem) => void
  onCommitRename: (id: string) => void
  onFolderNameChange: (v: string) => void
  onSetMoving: (id: string | null) => void
  onDeleteNote: (id: string) => void
  onMoveNote: (noteId: string, folderId: string | null) => void
  onConfirm: (item: { type: 'note' | 'folder'; id: string } | null) => void
  onDragStart: (item: DragItem) => void
  onDragEnd: () => void
  onDragOverFolder: (folderId: string) => void
  onDropOnFolder: (folderId: string) => void
}

function FolderRow({
  node, depth, workspaceId, folders, pathname, canSeeLock, canManage,
  openFolders, movingNote, confirming, editingFolder, folderName, editInputRef,
  dragItem, dropTarget,
  onToggle, onNewNote, onNewSubfolder, onDeleteFolder, onStartRename, onCommitRename,
  onFolderNameChange, onSetMoving, onDeleteNote, onMoveNote, onConfirm,
  onDragStart, onDragEnd, onDragOverFolder, onDropOnFolder,
}: FolderRowProps) {
  const isOpen = openFolders.has(node.id)
  const isEditing = editingFolder === node.id
  const isConfirming = confirming?.type === 'folder' && confirming.id === node.id
  const isDragging = dragItem?.type === 'folder' && dragItem.id === node.id
  const isDropTarget = dropTarget === node.id
  const indent = depth * 10

  const childProps = {
    workspaceId, folders, pathname, canSeeLock, canManage, openFolders, movingNote,
    confirming, editingFolder, folderName, editInputRef, dragItem, dropTarget,
    onToggle, onNewNote, onNewSubfolder, onDeleteFolder, onStartRename, onCommitRename,
    onFolderNameChange, onSetMoving, onDeleteNote, onMoveNote, onConfirm,
    onDragStart, onDragEnd, onDragOverFolder, onDropOnFolder,
  }

  return (
    <div className={`transition-opacity ${isDragging ? 'opacity-40' : ''}`}>
      <div
        style={{ paddingLeft: indent }}
        className={`flex items-center gap-1 group/folder rounded-md pr-1 py-1 pl-1 transition-colors ${
          isDropTarget
            ? 'bg-indigo-500/15 ring-1 ring-inset ring-indigo-500/40'
            : 'hover:bg-[#1c2333]'
        }`}
        draggable
        onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; onDragStart({ type: 'folder', id: node.id }) }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragOverFolder(node.id) }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropOnFolder(node.id) }}
      >
        <button onClick={() => onToggle(node.id)} className="text-gray-600 hover:text-gray-300 flex-shrink-0 p-0.5">
          <ChevronIcon open={isOpen} />
        </button>

        {isEditing ? (
          <input
            ref={editInputRef}
            value={folderName}
            onChange={(e) => onFolderNameChange(e.target.value)}
            onBlur={() => onCommitRename(node.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitRename(node.id)
              if (e.key === 'Escape') onCommitRename('')
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-[#2a3347] text-xs text-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        ) : (
          <button onDoubleClick={() => onStartRename(node)} className="flex-1 min-w-0 text-left text-xs font-medium text-gray-400 truncate">
            {node.name}
          </button>
        )}

        {isConfirming ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-gray-500">Delete?</span>
            <button onClick={() => onDeleteFolder(node.id)} className="text-[10px] px-1 rounded bg-red-600/80 hover:bg-red-600 text-white">Yes</button>
            <button onClick={() => onConfirm(null)} className="text-[10px] px-1 rounded bg-[#2a3347] hover:bg-[#333f57] text-gray-300">No</button>
          </div>
        ) : (
          canManage && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover/folder:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={(e) => { e.stopPropagation(); onNewNote(node.id) }} title="New note" className="p-0.5 rounded text-gray-600 hover:text-gray-300 hover:bg-[#2a3347]"><PlusIcon /></button>
              <button onClick={(e) => { e.stopPropagation(); onNewSubfolder(node.id) }} title="New subfolder" className="p-0.5 rounded text-gray-600 hover:text-gray-300 hover:bg-[#2a3347]"><FolderPlusIcon /></button>
              <button onClick={(e) => { e.stopPropagation(); onConfirm({ type: 'folder', id: node.id }) }} title="Delete folder" className="p-0.5 rounded text-gray-600 hover:text-red-400 hover:bg-[#2a3347]"><XSmallIcon /></button>
            </div>
          )
        )}
      </div>

      {isOpen && (
        <div style={{ paddingLeft: indent + 8 }} className="border-l border-[#2a3347] ml-3 mt-px space-y-px">
          {node.notes.map((note) => (
            <NoteRow key={note.id} note={note} {...childProps} />
          ))}
          {node.notes.length === 0 && node.children.length === 0 && (
            <p className="px-2 py-1 text-xs text-gray-700 italic">Empty</p>
          )}
          {node.children.map((child) => (
            <FolderRow key={child.id} node={child} depth={depth + 1} {...childProps} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

export default function NoteTree({ notes, folders, workspaceId, currentRole }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set(folders.map((f) => f.id)))
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [folderName, setFolderName] = useState('')
  const [movingNote, setMovingNote] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<{ type: 'note' | 'folder'; id: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [dragItem, setDragItem] = useState<DragItem | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const canManage = true
  const canSeeLock = currentRole === 'owner' || currentRole === 'dm'

  useEffect(() => {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      folders.forEach((f) => next.add(f.id))
      return next
    })
  }, [folders])

  useEffect(() => {
    if (editingFolder) editInputRef.current?.focus()
  }, [editingFolder])

  const tree = buildTree(folders, notes)
  const rootNotes = notes.filter((n) => n.folder_id === null)
  const filteredNotes = query.trim()
    ? notes.filter((n) => {
        const q = query.toLowerCase()
        return (n.title || 'Untitled').toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      })
    : null

  // ---- Standard actions ----

  function handleNewNote(folderId?: string) {
    startTransition(async () => { await createNote(workspaceId, folderId) })
  }

  function handleDeleteNote(noteId: string) {
    const noteHref = `/workspace/${workspaceId}/note/${noteId}`
    const isOnThisNote = pathname === noteHref || pathname.startsWith(noteHref + '/')
    setConfirming(null)
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteNote(noteId, workspaceId)
      if (result?.error) { setDeleteError(result.error); return }
      router.refresh()
      if (isOnThisNote) router.push(`/workspace/${workspaceId}`)
    })
  }

  function handleNewFolder() {
    startTransition(async () => { await createFolder(workspaceId); router.refresh() })
  }

  function handleNewSubfolder(parentId: string) {
    startTransition(async () => { await createSubfolder(parentId, workspaceId); router.refresh() })
  }

  function handleDeleteFolder(folderId: string) {
    setConfirming(null)
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteFolder(folderId, workspaceId)
      if (result?.error) { setDeleteError(result.error); return }
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
    if (!name || !folderId) return
    startTransition(async () => { await renameFolder(folderId, workspaceId, name); router.refresh() })
  }

  function handleMoveNote(noteId: string, folderId: string | null) {
    setMovingNote(null)
    startTransition(async () => { await setNoteFolder(noteId, workspaceId, folderId); router.refresh() })
  }

  // ---- Drag-and-drop ----

  function handleDragStart(item: DragItem) {
    setDragItem(item)
    setDropTarget(null)
  }

  function handleDragEnd() {
    setDragItem(null)
    setDropTarget(null)
  }

  function handleDragOverFolder(folderId: string) {
    if (!dragItem) return
    if (dragItem.type === 'folder') {
      // Can't drop folder on itself or on its own descendant
      if (dragItem.id === folderId) return
      if (isAncestorOf(folders, dragItem.id, folderId)) return
    }
    setDropTarget(folderId)
  }

  function handleDropOnFolder(folderId: string) {
    if (!dragItem) return
    if (dragItem.type === 'folder') {
      if (dragItem.id === folderId) return
      if (isAncestorOf(folders, dragItem.id, folderId)) return
      startTransition(async () => { await setFolderParent(dragItem.id, workspaceId, folderId); router.refresh() })
    } else {
      startTransition(async () => { await setNoteFolder(dragItem.id, workspaceId, folderId); router.refresh() })
    }
    handleDragEnd()
  }

  function handleDropOnRoot() {
    if (!dragItem) return
    if (dragItem.type === 'folder') {
      startTransition(async () => { await setFolderParent(dragItem.id, workspaceId, null); router.refresh() })
    } else {
      startTransition(async () => { await setNoteFolder(dragItem.id, workspaceId, null); router.refresh() })
    }
    handleDragEnd()
  }

  // ---- Shared props ----

  const dragProps = {
    dragItem, dropTarget,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragOverFolder: handleDragOverFolder,
    onDropOnFolder: handleDropOnFolder,
  }

  const sharedProps = {
    workspaceId, folders, pathname, canSeeLock, canManage, openFolders, movingNote,
    confirming, editingFolder, folderName, editInputRef,
    onToggle: (id: string) => setOpenFolders((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n }),
    onNewNote: handleNewNote,
    onNewSubfolder: handleNewSubfolder,
    onDeleteFolder: handleDeleteFolder,
    onStartRename: startRenameFolder,
    onCommitRename: commitRename,
    onFolderNameChange: setFolderName,
    onSetMoving: setMovingNote,
    onDeleteNote: handleDeleteNote,
    onMoveNote: handleMoveNote,
    onConfirm: setConfirming,
    ...dragProps,
  }

  const noteRowProps = {
    workspaceId, folders, pathname, canSeeLock, movingNote, confirming,
    onSetMoving: setMovingNote, onDeleteNote: handleDeleteNote, onMoveNote: handleMoveNote,
    onConfirm: setConfirming,
    ...dragProps,
  }

  const isRootDropTarget = dropTarget === '__root__' && dragItem !== null

  return (
    <div
      className="p-2"
      onClick={() => { setMovingNote(null); setConfirming(null) }}
      onDragOver={(e) => { e.preventDefault(); if (dragItem) setDropTarget('__root__') }}
      onDrop={(e) => { e.preventDefault(); if (dropTarget === '__root__') handleDropOnRoot() }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) handleDragEnd() }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 mb-1">
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Notes</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); router.refresh() }}
            title="Refresh"
            className="p-0.5 rounded hover:bg-[#1c2333] text-gray-600 hover:text-gray-300 transition-colors"
          >
            <RefreshIcon spin={isPending} />
          </button>
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

      {/* Delete error */}
      {deleteError && (
        <div className="mx-2 mb-1 px-2 py-1 rounded bg-red-900/40 border border-red-700/50 text-[10px] text-red-400 flex items-center justify-between gap-1">
          <span className="truncate">{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="flex-shrink-0 text-red-500 hover:text-red-300"><XSmallIcon /></button>
        </div>
      )}

      {/* Search */}
      <div className="px-2 mb-1.5">
        <div className="relative">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-600 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
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

      {/* Search results */}
      {filteredNotes ? (
        filteredNotes.length === 0 ? (
          <p className="px-2 py-3 text-xs text-gray-600 text-center">No notes match.</p>
        ) : (
          <ul className="space-y-px">
            {filteredNotes.map((note) => {
              const q = query.toLowerCase()
              const matched = note.tags.filter((t) => t.toLowerCase().includes(q))
              return <NoteRow key={note.id} note={note} matchedTags={matched} {...noteRowProps} />
            })}
          </ul>
        )
      ) : notes.length === 0 ? (
        <div className="px-2 py-6 text-center">
          <p className="text-xs text-gray-600">No notes yet.</p>
          <button onClick={() => handleNewNote()} className="mt-1 text-xs text-indigo-400 hover:underline">Create the first one</button>
        </div>
      ) : (
        <>
          <div className="space-y-px">
            {tree.map((node) => <FolderRow key={node.id} node={node} depth={0} {...sharedProps} />)}
          </div>

          {/* Root drop zone — shown when dragging and hovering over root area */}
          {dragItem && (
            <div
              className={`mx-1 my-1 rounded-md border border-dashed text-[10px] text-center py-1.5 transition-colors ${
                isRootDropTarget
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-[#2a3347] text-gray-700'
              }`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget('__root__') }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDropOnRoot() }}
            >
              Drop here to remove from folder
            </div>
          )}

          <div className="space-y-px mt-px">
            {rootNotes.map((note) => <NoteRow key={note.id} note={note} {...noteRowProps} />)}
          </div>
        </>
      )}
    </div>
  )
}

// Icons -----------------------------------------------------------------------

function PlusIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  )
}

function XSmallIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  )
}

function FolderPlusIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 4.75A2.75 2.75 0 014.75 2h3.215a2.75 2.75 0 011.985.841l.208.22H15.25A2.75 2.75 0 0118 5.75v.536A2.75 2.75 0 0118 7v7.25A2.75 2.75 0 0115.25 17H4.75A2.75 2.75 0 012 14.25V4.75z" opacity=".4"/>
      <path fillRule="evenodd" d="M10 8a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 0110 8z" clipRule="evenodd" />
    </svg>
  )
}

function FolderMoveIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 4.75A2.75 2.75 0 014.75 2h3.215a2.75 2.75 0 011.985.841l.208.22H15.25A2.75 2.75 0 0118 5.75v8.5A2.75 2.75 0 0115.25 17H4.75A2.75 2.75 0 012 14.25V4.75z" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  )
}

function RefreshIcon({ spin }: { spin: boolean }) {
  return (
    <svg className={`h-3.5 w-3.5 ${spin ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
    </svg>
  )
}
