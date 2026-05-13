'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import KanbanColumn from './KanbanColumn'
import { KanbanCardOverlay } from './KanbanCard'
import { createKanbanColumn, reorderKanbanColumns, reorderKanbanNotes } from '@/lib/actions/kanban'
import type { NoteListItem, KanbanColumnItem } from '@/lib/types'

interface Props {
  initialColumns: KanbanColumnItem[]
  initialNotes: NoteListItem[]
  workspaceId: string
}

export default function KanbanView({ initialColumns, initialNotes, workspaceId }: Props) {
  const [columns, setColumns] = useState(
    [...initialColumns].sort((a, b) => a.position - b.position),
  )
  const [notes, setNotes] = useState(initialNotes)
  const [activeCard, setActiveCard] = useState<NoteListItem | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)
  const [newColName, setNewColName] = useState('')
  const [addingCol, setAddingCol] = useState(false)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const columnIds = columns.map((c) => c.id)

  function notesForColumn(colId: string) {
    return notes
      .filter((n) => n.kanban_column_id === colId)
      .sort((a, b) => (a.kanban_position ?? 0) - (b.kanban_position ?? 0))
  }

  function onDragStart(event: DragStartEvent) {
    const { active } = event
    if (active.data.current?.type === 'card') {
      setActiveCard(notes.find((n) => n.id === active.id) ?? null)
    } else if (active.data.current?.type === 'column') {
      setActiveColumnId(active.id as string)
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    if (active.data.current?.type !== 'card') return

    const activeId = active.id as string
    const overId = over.id as string

    // Determine target column
    const overIsColumn = columns.some((c) => c.id === overId)
    const targetColId = overIsColumn
      ? overId
      : notes.find((n) => n.id === overId)?.kanban_column_id ?? null

    if (!targetColId) return

    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeId ? { ...n, kanban_column_id: targetColId } : n,
      ),
    )
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)
    setActiveColumnId(null)

    if (!over) return

    // Column reorder
    if (active.data.current?.type === 'column') {
      const oldIdx = columns.findIndex((c) => c.id === active.id)
      const newIdx = columns.findIndex((c) => c.id === over.id)
      if (oldIdx !== newIdx) {
        const reordered = arrayMove(columns, oldIdx, newIdx)
        setColumns(reordered)
        startTransition(() => {
          reorderKanbanColumns(workspaceId, reordered.map((c) => c.id))
        })
      }
      return
    }

    // Card drop
    if (active.data.current?.type === 'card') {
      const activeNote = notes.find((n) => n.id === active.id)
      if (!activeNote) return

      const overIsColumn = columns.some((c) => c.id === over.id)
      const targetColId = overIsColumn
        ? (over.id as string)
        : notes.find((n) => n.id === over.id)?.kanban_column_id ?? activeNote.kanban_column_id

      if (!targetColId) return

      // Build final ordered list for target column
      let colNotes = notes
        .filter((n) => n.kanban_column_id === targetColId)
        .sort((a, b) => (a.kanban_position ?? 0) - (b.kanban_position ?? 0))

      // Move active into target column if needed
      if (!colNotes.find((n) => n.id === active.id)) {
        colNotes = [...colNotes, { ...activeNote, kanban_column_id: targetColId }]
      }

      // Reorder within column
      if (!overIsColumn) {
        const oldIdx = colNotes.findIndex((n) => n.id === active.id)
        const newIdx = colNotes.findIndex((n) => n.id === over.id)
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          colNotes = arrayMove(colNotes, oldIdx, newIdx)
        }
      }

      // Apply positions
      const updates = colNotes.map((n, i) => ({
        noteId: n.id,
        columnId: targetColId,
        position: i * 1000,
      }))

      setNotes((prev) => {
        const posMap = new Map(updates.map((u) => [u.noteId, u]))
        return prev.map((n) => {
          const u = posMap.get(n.id)
          return u ? { ...n, kanban_column_id: u.columnId, kanban_position: u.position } : n
        })
      })

      startTransition(() => {
        reorderKanbanNotes(workspaceId, updates)
      })
    }
  }

  async function handleAddColumn() {
    const name = newColName.trim()
    if (!name) return
    setNewColName('')
    setAddingCol(false)
    const result = await createKanbanColumn(workspaceId, name)
    if ('id' in result) {
      // Optimistic: add placeholder; revalidatePath in action will refresh real data
      setColumns((prev) => [
        ...prev,
        { id: result.id, name, position: prev.length * 1000, color: null },
      ])
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 h-full items-start p-6 overflow-x-auto">
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              notes={notesForColumn(col.id)}
              workspaceId={workspaceId}
            />
          ))}
        </SortableContext>

        {/* Add column */}
        <div className="flex-shrink-0 w-64">
          {addingCol ? (
            <div className="bg-[#161b27] border border-[#2a3347] rounded-lg p-3 flex flex-col gap-2">
              <input
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn()
                  if (e.key === 'Escape') { setAddingCol(false); setNewColName('') }
                }}
                placeholder="Column name…"
                className="bg-[#0f1117] border border-[#2a3347] rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddColumn}
                  className="flex-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => { setAddingCol(false); setNewColName('') }}
                  className="px-2 py-1 rounded text-gray-500 hover:text-gray-300 text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingCol(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-[#2a3347] text-gray-600 hover:text-gray-400 hover:border-gray-600 text-sm transition-colors"
            >
              <PlusIcon />
              Add column
            </button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCard && (
          <KanbanCardOverlay title={activeCard.title} isDmOnly={activeCard.dm_only} />
        )}
        {activeColumnId && (() => {
          const col = columns.find((c) => c.id === activeColumnId)
          return col ? (
            <div
              className="w-64 bg-[#161b27] border border-indigo-500/50 rounded-lg px-3 py-2 shadow-xl opacity-90 text-sm font-medium text-gray-200"
              style={{ borderTopColor: col.color ?? '#6366f1', borderTopWidth: 2 }}
            >
              {col.name}
            </div>
          ) : null
        })()}
      </DragOverlay>
    </DndContext>
  )
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  )
}
