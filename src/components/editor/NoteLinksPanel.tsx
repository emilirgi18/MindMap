'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface LinkedNote {
  id: string
  title: string
}

interface Props {
  noteId: string
  workspaceId: string
  canEdit: boolean
}

function NoteChip({
  note,
  workspaceId: _workspaceId,
  onNavigate,
  onRemove,
}: {
  note: LinkedNote
  workspaceId: string
  onNavigate: () => void
  onRemove?: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full bg-indigo-600/15 border border-indigo-500/20 text-xs text-indigo-300">
      <button onClick={onNavigate} className="hover:text-indigo-100 transition-colors">
        {note.title}
      </button>
      {onRemove && (
        <button
          onClick={onRemove}
          title="Remove link"
          className="ml-0.5 rounded-full p-0.5 text-indigo-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      )}
    </span>
  )
}

export default function NoteLinksPanel({ noteId, workspaceId, canEdit }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [links, setLinks] = useState<LinkedNote[]>([])
  const [backlinks, setBacklinks] = useState<LinkedNote[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LinkedNote[]>([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load outgoing links AND incoming backlinks
  useEffect(() => {
    async function load() {
      const [{ data: outRows }, { data: inRows }] = await Promise.all([
        supabase.from('note_links').select('target_id').eq('source_id', noteId),
        supabase.from('note_links').select('source_id').eq('target_id', noteId),
      ])

      const outIds = (outRows ?? []).map((r) => r.target_id)
      const inIds = (inRows ?? []).map((r) => r.source_id)
      const seen = new Set<string>()
      const allIds = [...outIds, ...inIds].filter((id) => {
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })

      if (allIds.length === 0) { setLinks([]); setBacklinks([]); return }

      const { data: notes } = await supabase
        .from('notes')
        .select('id, title')
        .in('id', allIds)

      const noteMap = Object.fromEntries(
        (notes ?? []).map((n) => [n.id, n.title || 'Untitled'])
      )
      setLinks(outIds.map((id) => ({ id, title: noteMap[id] ?? 'Untitled' })))
      setBacklinks(inIds.map((id) => ({ id, title: noteMap[id] ?? 'Untitled' })))
    }
    load()
  }, [noteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Search notes by title (debounced)
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('notes')
        .select('id, title')
        .eq('workspace_id', workspaceId)
        .neq('id', noteId)
        .ilike('title', `%${query}%`)
        .limit(6)
      const filtered = (data ?? []).filter((n) => !links.find((l) => l.id === n.id))
      setResults(filtered.map((n) => ({ id: n.id, title: n.title || 'Untitled' })))
    }, 200)
    return () => clearTimeout(timer)
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function addLink(target: LinkedNote) {
    await supabase.from('note_links').upsert(
      { source_id: noteId, target_id: target.id },
      { onConflict: 'source_id,target_id', ignoreDuplicates: true }
    )
    setLinks((prev) => [...prev, target])
    setQuery('')
    setResults([])
    setOpen(false)
  }

  async function removeLink(targetId: string) {
    await supabase.from('note_links').delete().eq('source_id', noteId).eq('target_id', targetId)
    setLinks((prev) => prev.filter((l) => l.id !== targetId))
  }

  return (
    <div className="mt-6 pt-5 border-t border-[#2a3347] space-y-4">

      {/* Outgoing links */}
      <div>
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">
          Linked notes
        </p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {links.map((link) => (
            <NoteChip
              key={link.id}
              note={link}
              workspaceId={workspaceId}
              onNavigate={() => router.push(`/workspace/${workspaceId}/note/${link.id}`)}
              onRemove={canEdit ? () => removeLink(link.id) : undefined}
            />
          ))}
          {links.length === 0 && (
            <span className="text-xs text-gray-600">None yet.</span>
          )}
        </div>

        {canEdit && (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder="Link a note…"
              className="w-full max-w-xs bg-[#1c2333] border border-[#2a3347] rounded-md px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {open && results.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-10 mt-1 w-full max-w-xs bg-[#1c2333] border border-[#2a3347] rounded-lg shadow-lg overflow-hidden"
              >
                {results.map((note) => (
                  <button
                    key={note.id}
                    onMouseDown={(e) => { e.preventDefault(); addLink(note) }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#2a3347] hover:text-white transition-colors"
                  >
                    {note.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Backlinks (incoming) */}
      {backlinks.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">
            Mentioned in
          </p>
          <div className="flex flex-wrap gap-1.5">
            {backlinks.map((link) => (
              <NoteChip
                key={link.id}
                note={link}
                workspaceId={workspaceId}
                onNavigate={() => router.push(`/workspace/${workspaceId}/note/${link.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
