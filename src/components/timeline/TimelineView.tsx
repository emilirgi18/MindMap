'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { reorderTimeline } from '@/lib/actions/kanban'
import { createClient } from '@/lib/supabase/client'
import { getRecentUpdate, subscribeBoardUpdates } from '@/lib/boardSync'
import type { NoteListItem } from '@/lib/types'

interface Props {
  initialNotes: NoteListItem[]
  workspaceId: string
}

function excerpt(body: string | undefined, max = 120): string {
  if (!body) return ''
  const text = body
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.+?)\]\(.*?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

export default function TimelineView({ initialNotes, workspaceId }: Props) {
  const [notes, setNotes] = useState(
    [...initialNotes]
      .filter((n) => n.timeline_position !== null)
      .sort((a, b) => (a.timeline_position ?? 0) - (b.timeline_position ?? 0)),
  )
  const [activeNote, setActiveNote] = useState<NoteListItem | null>(null)
  const channelRef = useRef<import('@supabase/supabase-js').RealtimeChannel | null>(null)
  const router = useRouter()

  const fetchNotes = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notes')
      .select('id, title, body, dm_only, updated_at, kanban_column_id, kanban_position, timeline_position, folder_id')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .not('timeline_position', 'is', null)
      .order('timeline_position', { ascending: true })
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

          if (eventType === 'DELETE') {
            setNotes((prev) => prev.filter((n) => n.id !== oldRow.id))
            return
          }

          if (row.deleted_at || row.timeline_position === null) {
            setNotes((prev) => prev.filter((n) => n.id !== row.id))
            return
          }

          setNotes((prev) => {
            const exists = prev.some((n) => n.id === row.id)
            const patched: NoteListItem = exists
              ? { ...prev.find((n) => n.id === row.id)!, title: row.title, body: row.body, dm_only: row.dm_only, updated_at: row.updated_at, timeline_position: row.timeline_position }
              : { id: row.id, title: row.title, body: row.body, dm_only: row.dm_only, updated_at: row.updated_at, timeline_position: row.timeline_position, kanban_column_id: row.kanban_column_id, kanban_position: row.kanban_position, folder_id: null, tags: [] }
            const next = exists ? prev.map((n) => n.id === row.id ? patched : n) : [...prev, patched]
            return next.sort((a, b) => (a.timeline_position ?? 0) - (b.timeline_position ?? 0))
          })

          // Re-fetch tags for this note
          supabase.from('tags').select('name').eq('note_id', row.id).then(({ data }) => {
            if (!data) return
            const tagNames = data.map((t) => t.name).sort()
            setNotes((prev) => prev.map((n) => n.id === row.id ? { ...n, tags: tagNames } : n))
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
      .on('broadcast', { event: 'refresh' }, () => {
        console.log('[Timeline Realtime] broadcast refresh received')
        fetchNotes()
      })
      .subscribe((status, err) => {
        if (err) console.error('[Timeline Realtime] error:', err)
        else if (status === 'SUBSCRIBED') console.log('[Timeline Realtime] subscribed ✓')
        else if (status === 'CHANNEL_ERROR') console.error('[Timeline Realtime] channel error')
        else if (status === 'TIMED_OUT') console.warn('[Timeline Realtime] timed out')
      })

    channelRef.current = channel
    return () => { supabase.removeChannel(channel); channelRef.current = null }
  }, [workspaceId, fetchNotes])

  function broadcast() {
    channelRef.current?.send({ type: 'broadcast', event: 'refresh', payload: {} })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function onDragStart(event: DragStartEvent) {
    setActiveNote(notes.find((n) => n.id === event.active.id) ?? null)
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveNote(null)
    if (!over || active.id === over.id) return
    setNotes((prev) => {
      const oldIdx = prev.findIndex((n) => n.id === active.id)
      const newIdx = prev.findIndex((n) => n.id === over.id)
      const reordered = arrayMove(prev, oldIdx, newIdx)
      reorderTimeline(workspaceId, reordered.map((n) => n.id)).then(broadcast)
      return reordered
    })
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
        <TimelineIcon className="h-10 w-10 opacity-30" />
        <p className="text-sm">No events on the timeline yet.</p>
        <p className="text-xs text-slate-600">Open a note and click &quot;Add to timeline&quot;.</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="relative h-full overflow-y-auto py-8">
        {/* Center spine */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#334155] -translate-x-1/2 pointer-events-none" />

        {/* Refresh */}
        <div className="absolute top-3 right-4 z-10">
          <button
            onClick={() => router.refresh()}
            title="Refresh"
            className="p-1 rounded hover:bg-slate-700/40 text-slate-500 hover:text-orange-400 transition-colors"
          >
            <RefreshIcon />
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-4">
          <SortableContext items={notes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
            {notes.map((note, idx) => (
              <TimelineItem
                key={note.id}
                note={note}
                workspaceId={workspaceId}
                isLeft={idx % 2 === 0}
              />
            ))}
          </SortableContext>
        </div>
      </div>

      <DragOverlay>
        {activeNote && <TimelineCardOverlay note={activeNote} />}
      </DragOverlay>
    </DndContext>
  )
}

// ---------------------------------------------------------------------------
// Single timeline row
// ---------------------------------------------------------------------------

function TimelineItem({
  note,
  workspaceId,
  isLeft,
}: {
  note: NoteListItem
  workspaceId: string
  isLeft: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const card = (
    <div className={`relative bg-[#1e293b] border border-[#334155] rounded-lg overflow-hidden group/card ${isLeft ? 'mr-2' : 'ml-2'}`}>
      {/* Connector notch */}
      <div
        className={`absolute top-[18px] w-5 h-px bg-[#334155] ${
          isLeft ? '-right-[21px]' : '-left-[21px]'
        }`}
      />

      {/* Header */}
      <div className="flex items-start gap-2 px-3 pt-3 pb-1">
        <button
          {...attributes}
          {...listeners}
          className="text-slate-600 hover:text-orange-400 cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5"
          title="Drag to reorder"
        >
          <GripIcon />
        </button>
        <div className="flex-1 min-w-0">
          <Link
            href={`/workspace/${workspaceId}/note/${note.id}`}
            className="text-sm font-medium text-slate-200 hover:text-white line-clamp-2 leading-snug"
          >
            {note.title || 'Untitled'}
          </Link>
        </div>
        {note.dm_only && (
          <span className="text-[10px] text-orange-400 font-medium flex-shrink-0 mt-0.5">DM</span>
        )}
      </div>

      {/* Excerpt */}
      {excerpt(note.body) && (
        <p className="px-3 pb-2 pl-8 text-xs text-slate-500 leading-relaxed line-clamp-3">
          {excerpt(note.body)}
        </p>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="px-3 pb-3 pl-8 flex flex-wrap gap-1">
          {note.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400">
              {tag}
            </span>
          ))}
          {note.tags.length > 4 && (
            <span className="text-[10px] text-slate-500">+{note.tags.length - 4}</span>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div ref={setNodeRef} style={style} className="flex items-start mb-8">
      {/* Left half */}
      <div className="flex-1 flex justify-end">
        {isLeft ? card : null}
      </div>

      {/* Center dot */}
      <div className="flex-shrink-0 w-10 flex justify-center pt-[14px]">
        <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-[#0f172a] z-10" />
      </div>

      {/* Right half */}
      <div className="flex-1">
        {!isLeft ? card : null}
      </div>
    </div>
  )
}

function TimelineCardOverlay({ note }: { note: NoteListItem }) {
  return (
    <div className="bg-[#1e293b] border border-orange-500/40 rounded-lg shadow-xl px-3 py-2.5 max-w-xs">
      <span className="text-sm font-medium text-slate-200 line-clamp-1">{note.title || 'Untitled'}</span>
      {excerpt(note.body) && (
        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{excerpt(note.body)}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function RefreshIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
    </svg>
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

function TimelineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
      <line x1="12" y1="7" x2="12" y2="10" /><line x1="12" y1="14" x2="12" y2="17" />
    </svg>
  )
}
