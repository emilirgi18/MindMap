'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  noteId: string
  workspaceId: string
  canEdit: boolean
}

export default function TagsPanel({ noteId, workspaceId, canEdit }: Props) {
  const supabase = createClient()
  const [tags, setTags] = useState<string[]>([])
  const [pool, setPool] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load this note's tags
  useEffect(() => {
    supabase
      .from('tags')
      .select('name')
      .eq('note_id', noteId)
      .then(({ data }) => setTags((data ?? []).map((t) => t.name).sort()))
  }, [noteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load workspace-wide tag pool (all distinct tag names across the workspace)
  useEffect(() => {
    async function loadPool() {
      // Get all non-deleted note IDs in this workspace
      const { data: notesData } = await supabase
        .from('notes')
        .select('id')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)

      const noteIds = (notesData ?? []).map((n) => n.id)
      if (noteIds.length === 0) { setPool([]); return }

      const { data: tagData } = await supabase
        .from('tags')
        .select('name')
        .in('note_id', noteIds)

      const unique = [...new Set((tagData ?? []).map((t) => t.name))].sort()
      setPool(unique)
    }
    loadPool()
  }, [workspaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const suggestions = pool.filter(
    (t) => !tags.includes(t) && t.toLowerCase().includes(input.toLowerCase())
  )
  const trimmed = input.trim().toLowerCase()
  const isNew = trimmed.length > 0 && !pool.includes(trimmed)

  async function addTag(name: string) {
    const n = name.trim().toLowerCase()
    if (!n || tags.includes(n)) return
    await supabase
      .from('tags')
      .upsert({ note_id: noteId, name: n }, { onConflict: 'note_id,name', ignoreDuplicates: true })
    setTags((prev) => [...prev, n].sort())
    if (!pool.includes(n)) setPool((prev) => [...prev, n].sort())
    setInput('')
    setOpen(false)
  }

  async function removeTag(name: string) {
    await supabase.from('tags').delete().eq('note_id', noteId).eq('name', name)
    setTags((prev) => prev.filter((t) => t !== name))
  }

  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Tags</p>

      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[22px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-emerald-600/15 border border-emerald-500/20 text-xs text-emerald-300"
          >
            {tag}
            {canEdit && (
              <button
                onClick={() => removeTag(tag)}
                className="rounded-full p-0.5 text-emerald-400/50 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </span>
        ))}
        {tags.length === 0 && <span className="text-xs text-gray-600">No tags yet.</span>}
      </div>

      {canEdit && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && trimmed) { e.preventDefault(); addTag(input) }
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Add a tag…"
            className="w-full max-w-[200px] bg-[#1c2333] border border-[#2a3347] rounded-md px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {open && (isNew || suggestions.length > 0) && (
            <div
              ref={dropdownRef}
              className="absolute z-10 mt-1 w-full max-w-[200px] bg-[#1c2333] border border-[#2a3347] rounded-lg shadow-lg overflow-hidden"
            >
              {isNew && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); addTag(input) }}
                  className="w-full text-left px-3 py-2 text-xs text-emerald-400 hover:bg-[#2a3347] transition-colors"
                >
                  Create &ldquo;{trimmed}&rdquo;
                </button>
              )}
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  onMouseDown={(e) => { e.preventDefault(); addTag(tag) }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#2a3347] hover:text-white transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
