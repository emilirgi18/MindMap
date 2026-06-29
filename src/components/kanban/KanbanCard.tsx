'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { excerpt } from '@/lib/utils'

interface Props {
  noteId: string
  title: string
  body?: string
  workspaceId: string
  isDmOnly: boolean
}

export default function KanbanCard({ noteId, title, body, workspaceId, isDmOnly }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: noteId, data: { type: 'card' } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const ex = excerpt(body)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2.5 select-none"
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          className="text-slate-600 hover:text-orange-400 cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5"
          title="Drag to reorder"
          tabIndex={-1}
        >
          <GripIcon />
        </button>
        <div className="flex-1 min-w-0">
          <Link
            href={`/workspace/${workspaceId}/note/${noteId}`}
            className="text-sm text-slate-200 hover:text-white leading-snug break-words line-clamp-2"
          >
            {title || 'Untitled'}
          </Link>
          {ex && (
            <p className="mt-1 text-[11px] text-slate-500 leading-snug line-clamp-2">{ex}</p>
          )}
        </div>
        {isDmOnly && (
          <span className="text-[10px] text-orange-400 font-medium flex-shrink-0 mt-0.5">DM</span>
        )}
      </div>
    </div>
  )
}

// Overlay version rendered while dragging (no sortable hooks, just visual)
export function KanbanCardOverlay({ title, isDmOnly }: { title: string; isDmOnly: boolean }) {
  return (
    <div className="bg-[#1e293b] border border-orange-500/40 rounded-lg px-3 py-2.5 shadow-xl">
      <div className="flex items-start gap-2">
        <GripIcon />
        <span className="text-sm text-slate-200 leading-snug flex-1 min-w-0">{title || 'Untitled'}</span>
        {isDmOnly && (
          <span className="text-[10px] text-orange-400 font-medium flex-shrink-0 mt-0.5">DM</span>
        )}
      </div>
    </div>
  )
}

function GripIcon() {
  return (
    <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <circle cx="7" cy="5" r="1.2" /><circle cx="13" cy="5" r="1.2" />
      <circle cx="7" cy="10" r="1.2" /><circle cx="13" cy="10" r="1.2" />
      <circle cx="7" cy="15" r="1.2" /><circle cx="13" cy="15" r="1.2" />
    </svg>
  )
}
