'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
import { createClient } from '@/lib/supabase/client'
import { getRecentUpdate, subscribeBoardUpdates } from '@/lib/boardSync'
import type { NoteListItem, KanbanColumnItem } from '@/lib/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

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
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Fetch fresh notes directly from Supabase (bypasses all Next.js caches)
  const fetchNotes = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notes')
      .select('id, title, body, dm_only, updated_at, kanban_column_id, kanban_position, timeline_position, folder_id')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .not('kanban_column_id', 'is', null)
    if (!data) return
    if (data.length === 0) { setNotes([]); return }
    const noteIds = data.map((n) => n.id)
    const { data: tagData } = await supabase.from('tags').select('note_id, name').in('note_id', noteIds)
    const tagsMap = new Map<string, string[]>()
    for (const t of tagData ?? []) {
      const arr = tagsMap.get(t.note_id) ?? []
      arr.push(t.name)
      tagsMap.set(t.note_id, arr)
    }
    setNotes(data.map((n) => ({ ...n, tags: tagsMap.get(n.id) ?? [] }) as NoteListItem))
  }, [workspaceId])

  // Mount: immediate fetch + delayed fallback + same-tab event bus
  useEffect(() => {
    fetchNotes()
    const recentUpdate = getRecentUpdate(workspaceId)
    const timer = setTimeout(fetchNotes, recentUpdate ? 500 : 2000)
    const unsub = subscribeBoardUpdates(workspaceId, fetchNotes)
    return () => { clearTimeout(timer); unsub() }
  }, [workspaceId, fetchNotes])

  // Realtime: postgres_changes + broadcast (cross-tab)
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`workspace-sync-${workspaceId}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const { eventType } = payload
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row = (payload.new ?? {}) as any
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const oldRow = (payload.old ?? {}) as any

          console.log('[Kanban Realtime] postgres_changes:', eventType, row.id)

          if (eventType === 'DELETE') {
            setNotes((prev) => prev.filter((n) => n.id !== oldRow.id))
            return
          }
          if (row.deleted_at || !row.kanban_column_id) {
            setNotes((prev) => prev.filter((n) => n.id !== row.id))
            return
          }

          setNotes((prev) => {
            const exists = prev.some((n) => n.id === row.id)
            const patched: NoteListItem = exists
              ? { ...prev.find((n) => n.id === row.id)!, title: row.title, body: row.body, dm_only: row.dm_only, updated_at: row.updated_at, kanban_column_id: row.kanban_column_id, kanban_position: row.kanban_position }
              : { id: row.id, title: row.title, body: row.body, dm_only: row.dm_only, updated_at: row.updated_at, kanban_column_id: row.kanban_column_id, kanban_position: row.kanban_position, timeline_position: row.timeline_position, folder_id: null, tags: [] }
            return exists ? prev.map((n) => n.id === row.id ? patched : n) : [...prev, patched]
          })

          supabase.from('tags').select('name').eq('note_id', row.id).then(({ data }) => {
            if (!data) return
            setNotes((prev) => prev.map((n) => n.id === row.id ? { ...n, tags: data.map((t) => t.name).sort() } : n))
          })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tags' },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row = ((payload.new && (payload.new as any).note_id) ? payload.new : payload.old) as any
          const noteId: string | undefined = row?.note_id
          if (!noteId) return
          supabase.from('tags').select('name').eq('note_id', noteId).then(({ data }) => {
            if (!data) return
            const tagNames = data.map((t) => t.name).sort()
            setNotes((prev) => {
              if (!prev.some((n) => n.id === noteId)) return prev
              return prev.map((n) => n.id === noteId ? { ...n, tags: tagNames } : n)
            })
          })
        },
      )
      // Broadcast: another tab sent a refresh signal — just re-fetch
      .on('broadcast', { event: 'refresh' }, () => {
        console.log('[Kanban Realtime] broadcast refresh received')
        fetchNotes()
      })
      .subscribe((status, err) => {
        if (err) console.error('[Kanban Realtime] error:', err)
        else if (status === 'SUBSCRIBED') console.log('[Kanban Realtime] subscribed ✓')
        else if (status === 'CHANNEL_ERROR') console.error('[Kanban Realtime] channel error')
        else if (status === 'TIMED_OUT') console.warn('[Kanban Realtime] timed out')
      })

    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [workspaceId, fetchNotes])

  function broadcast() {
    channelRef.current?.send({ type: 'broadcast', event: 'refresh', payload: {} })
  }

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

    const overIsColumn = columns.some((c) => c.id === overId)
    const targetColId = overIsColumn
      ? overId
      : notes.find((n) => n.id === overId)?.kanban_column_id ?? null

    if (!targetColId) return
    setNotes((prev) =>
      prev.map((n) => n.id === activeId ? { ...n, kanban_column_id: targetColId } : n),
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
        reorderKanbanColumns(workspaceId, reordered.map((c) => c.id)).then(broadcast)
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

      let colNotes = notes
        .filter((n) => n.kanban_column_id === targetColId)
        .sort((a, b) => (a.kanban_position ?? 0) - (b.kanban_position ?? 0))

      if (!colNotes.find((n) => n.id === active.id)) {
        colNotes = [...colNotes, { ...activeNote, kanban_column_id: targetColId }]
      }

      if (!overIsColumn) {
        const oldIdx = colNotes.findIndex((n) => n.id === active.id)
        const newIdx = colNotes.findIndex((n) => n.id === over.id)
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          colNotes = arrayMove(colNotes, oldIdx, newIdx)
        }
      }

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

      reorderKanbanNotes(workspaceId, updates).then(broadcast)
    }
  }

  async function handleAddColumn() {
    const name = newColName.trim()
    if (!name) return
    setNewColName('')
    setAddingCol(false)
    const result = await createKanbanColumn(workspaceId, name)
    if ('id' in result) {
      setColumns((prev) => [
        ...prev,
        { id: result.id, name, position: prev.length * 1000, color: null },
      ])
      broadcast()
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
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-3 flex flex-col gap-2">
              <input
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn()
                  if (e.key === 'Escape') { setAddingCol(false); setNewColName('') }
                }}
                placeholder="Column name…"
                className="bg-[#0f172a] border border-[#334155] rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddColumn}
                  className="flex-1 px-2 py-1 rounded bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => { setAddingCol(false); setNewColName('') }}
                  className="px-2 py-1 rounded text-slate-500 hover:text-slate-200 text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingCol(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-[#334155] text-slate-500 hover:text-orange-400 hover:border-orange-500/40 text-sm transition-colors"
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
              className="w-64 bg-[#1e293b] border border-orange-500/40 rounded-lg px-3 py-2 shadow-xl opacity-90 text-sm font-medium text-slate-200"
              style={{ borderTopColor: col.color ?? '#f97316', borderTopWidth: 2 }}
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
