'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'

function excerpt(body: string | undefined, max = 100): string {
  if (!body) return ''
  const text = body
    .replace(/^#{1,6}\s+/gm, '')   // headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1')    // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // code
    .replace(/!\[.*?\]\(.*?\)/g, '') // images
    .replace(/\[(.+?)\]\(.*?\)/g, '$1') // links
    .replace(/^[-*+]\s+/gm, '')     // bullets
    .replace(/^\d+\.\s+/gm, '')     // ordered list
    .replace(/^>\s+/gm, '')         // blockquotes
    .replace(/\n+/g, ' ')
    .trim()
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="group bg-[#1c2333] border border-[#2a3347] rounded-lg px-3 py-2.5 cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-start justify-between gap-2" {...listeners}>
        <span className="text-sm text-gray-200 leading-snug flex-1 min-w-0 break-words">
          {title || 'Untitled'}
        </span>
        {isDmOnly && (
          <span className="text-[10px] text-amber-400 font-medium flex-shrink-0 mt-0.5">DM</span>
        )}
      </div>
      {excerpt(body) && (
        <p className="mt-1 text-[11px] text-gray-500 leading-snug line-clamp-2" {...listeners}>
          {excerpt(body)}
        </p>
      )}
      <Link
        href={`/workspace/${workspaceId}/note/${noteId}`}
        className="mt-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        Open →
      </Link>
    </div>
  )
}

// Overlay version rendered while dragging (no sortable hooks, just visual)
export function KanbanCardOverlay({ title, isDmOnly }: { title: string; isDmOnly: boolean }) {
  return (
    <div className="bg-[#1c2333] border border-indigo-500/50 rounded-lg px-3 py-2.5 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-gray-200 leading-snug">{title || 'Untitled'}</span>
        {isDmOnly && (
          <span className="text-[10px] text-amber-400 font-medium flex-shrink-0 mt-0.5">DM</span>
        )}
      </div>
    </div>
  )
}
