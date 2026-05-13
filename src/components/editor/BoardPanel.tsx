'use client'

import { useState, useTransition } from 'react'
import { addNoteToTimeline, removeNoteFromTimeline, moveNoteToColumn } from '@/lib/actions/kanban'
import type { KanbanColumnItem } from '@/lib/types'

interface Props {
  noteId: string
  workspaceId: string
  kanbanColumns: KanbanColumnItem[]
  initialKanbanColumnId: string | null
  initialOnTimeline: boolean
}

export default function BoardPanel({ noteId, workspaceId, kanbanColumns, initialKanbanColumnId, initialOnTimeline }: Props) {
  const [kanbanColumnId, setKanbanColumnId] = useState(initialKanbanColumnId)
  const [onTimeline, setOnTimeline] = useState(initialOnTimeline)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [pending, startTransition] = useTransition()

  const currentColumn = kanbanColumns.find((c) => c.id === kanbanColumnId)

  function handleTimelineToggle() {
    if (onTimeline) {
      setOnTimeline(false)
      startTransition(async () => { await removeNoteFromTimeline(noteId, workspaceId) })
    } else {
      setOnTimeline(true)
      startTransition(async () => { await addNoteToTimeline(noteId, workspaceId) })
    }
  }

  function handleColumnSelect(colId: string | null) {
    setShowColumnPicker(false)
    setKanbanColumnId(colId)
    startTransition(async () => { await moveNoteToColumn(noteId, workspaceId, colId) })
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Views</p>

      {/* Timeline */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <TimelineIcon /> Timeline
        </div>
        <button
          onClick={handleTimelineToggle}
          disabled={pending}
          className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
            onTimeline
              ? 'bg-orange-500/15 text-orange-400 hover:bg-red-900/20 hover:text-red-400'
              : 'bg-[#293548] text-slate-500 hover:text-slate-200'
          }`}
        >
          {onTimeline ? 'Remove' : '+ Add'}
        </button>
      </div>

      {/* Kanban */}
      <div className="flex items-center justify-between gap-2 relative">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <KanbanIcon /> Kanban
        </div>
        <div className="relative">
          {currentColumn ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowColumnPicker((v) => !v)}
                disabled={pending}
                className="text-[11px] px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-colors max-w-[90px] truncate"
                style={{ borderLeft: `2px solid ${currentColumn.color ?? '#f97316'}` }}
              >
                {currentColumn.name}
              </button>
              <button onClick={() => handleColumnSelect(null)} disabled={pending} className="text-slate-600 hover:text-red-400 transition-colors" title="Remove from kanban">
                <XIcon />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowColumnPicker((v) => !v)}
              disabled={pending || kanbanColumns.length === 0}
              className="text-[11px] px-2 py-0.5 rounded bg-[#293548] text-slate-500 hover:text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={kanbanColumns.length === 0 ? 'Create a column on the Kanban board first' : undefined}
            >
              + Add
            </button>
          )}

          {showColumnPicker && (
            <div className="absolute right-0 top-6 z-20 bg-[#1e293b] border border-[#334155] rounded-lg shadow-xl min-w-[140px] py-1">
              {kanbanColumns.map((col) => (
                <button
                  key={col.id}
                  onClick={() => handleColumnSelect(col.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700/40 hover:text-white transition-colors text-left"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.color ?? '#f97316' }} />
                  <span className="truncate">{col.name}</span>
                  {col.id === kanbanColumnId && <CheckIcon className="ml-auto flex-shrink-0 text-orange-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TimelineIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" />
      <line x1="10" y1="5.5" x2="10" y2="8.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10" y1="11.5" x2="10" y2="14.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function KanbanIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <rect x="2" y="3" width="4" height="14" rx="1" />
      <rect x="8" y="3" width="4" height="9" rx="1" />
      <rect x="14" y="3" width="4" height="11" rx="1" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={`h-3 w-3 ${className ?? ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  )
}
