'use client'

import { useState, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import KanbanCard from './KanbanCard'
import { updateKanbanColumn, deleteKanbanColumn } from '@/lib/actions/kanban'
import type { NoteListItem, KanbanColumnItem } from '@/lib/types'

interface Props {
  column: KanbanColumnItem
  notes: NoteListItem[]
  workspaceId: string
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
]

export default function KanbanColumn({ column, notes, workspaceId }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(column.name)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sortable for column reordering
  const {
    attributes: colAttrs,
    listeners: colListeners,
    setNodeRef: setColRef,
    transform,
    transition,
    isDragging: isColDragging,
  } = useSortable({ id: column.id, data: { type: 'column' } })

  // Droppable for accepting cards
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.id })

  const noteIds = notes.map((n) => n.id)
  const accentColor = column.color ?? '#6366f1'

  async function saveName() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === column.name) { setEditing(false); return }
    setSaving(true)
    await updateKanbanColumn(column.id, workspaceId, { name: trimmed })
    setSaving(false)
    setEditing(false)
  }

  async function handleColorSelect(color: string) {
    setShowColorPicker(false)
    await updateKanbanColumn(column.id, workspaceId, { color })
  }

  async function handleDelete() {
    if (!confirm(`Delete column "${column.name}"? Cards will be unassigned.`)) return
    await deleteKanbanColumn(column.id, workspaceId)
  }

  const colStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isColDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setColRef}
      style={colStyle}
      className="flex flex-col w-64 flex-shrink-0"
    >
      {/* Column header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg border-t-2 bg-[#161b27] border-x border-[#2a3347]"
        style={{ borderTopColor: accentColor }}
      >
        {/* Drag handle */}
        <button
          {...colAttrs}
          {...colListeners}
          className="text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0"
          title="Drag to reorder column"
        >
          <GripIcon />
        </button>

        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(column.name); setEditing(false) } }}
            className="flex-1 min-w-0 bg-transparent text-sm font-medium text-white focus:outline-none border-b border-indigo-500"
            disabled={saving}
            autoFocus
          />
        ) : (
          <button
            onDoubleClick={() => { setEditing(true); setTimeout(() => inputRef.current?.select(), 0) }}
            className="flex-1 min-w-0 text-left text-sm font-medium text-gray-200 truncate"
            title="Double-click to rename"
          >
            {column.name}
          </button>
        )}

        <span className="text-xs text-gray-600 flex-shrink-0">{notes.length}</span>

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowColorPicker((v) => !v)}
            className="w-3 h-3 rounded-full border border-[#2a3347] flex-shrink-0"
            style={{ backgroundColor: accentColor }}
            title="Change color"
          />
          {showColorPicker && (
            <div className="absolute right-0 top-5 z-20 bg-[#1c2333] border border-[#2a3347] rounded-lg p-2 shadow-xl flex flex-wrap gap-1.5 w-32">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => handleColorSelect(c)}
                  className="w-5 h-5 rounded-full border-2 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c, borderColor: c === accentColor ? 'white' : 'transparent' }}
                />
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleDelete}
          className="text-gray-700 hover:text-red-400 transition-colors flex-shrink-0"
          title="Delete column"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Cards area */}
      <div
        ref={setDropRef}
        className={`flex-1 min-h-[120px] flex flex-col gap-2 p-2 rounded-b-lg border border-t-0 border-[#2a3347] transition-colors ${
          isOver ? 'bg-indigo-500/5' : 'bg-[#0f1117]/60'
        }`}
      >
        <SortableContext items={noteIds} strategy={verticalListSortingStrategy}>
          {notes.map((note) => (
            <KanbanCard
              key={note.id}
              noteId={note.id}
              title={note.title}
              body={note.body}
              workspaceId={workspaceId}
              isDmOnly={note.dm_only}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

function GripIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <circle cx="7" cy="5" r="1.2" /><circle cx="13" cy="5" r="1.2" />
      <circle cx="7" cy="10" r="1.2" /><circle cx="13" cy="10" r="1.2" />
      <circle cx="7" cy="15" r="1.2" /><circle cx="13" cy="15" r="1.2" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  )
}
