'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExt from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import { Markdown } from 'tiptap-markdown'
import * as Y from 'yjs'
import { SupabaseProvider } from '@/lib/yjs/SupabaseProvider'
import { fromBase64, toBase64, getUserColor } from '@/lib/yjs/utils'
import { createClient } from '@/lib/supabase/client'
import Toolbar from './Toolbar'
import PresenceBar from './PresenceBar'
import NoteLinksPanel from './NoteLinksPanel'
import TagsPanel from './TagsPanel'
import BoardPanel from './BoardPanel'
import { setNoteDmOnly } from '@/lib/actions/notes'
import type { KanbanColumnItem } from '@/lib/types'

interface NoteData {
  id: string
  title: string
  body: string
  yjs_state: string | null
  workspace_id: string
  dm_only: boolean
  kanban_column_id?: string | null
  timeline_position?: number | null
}

interface UserProfile {
  id: string
  full_name: string | null
  email: string
}

interface Props {
  note: NoteData
  role: string
  profile: UserProfile
  kanbanColumns?: KanbanColumnItem[]
}

type SaveStatus = 'saved' | 'saving' | 'unsaved'

interface CollabState {
  noteId: string
  ydoc: Y.Doc
  provider: SupabaseProvider
}

let activeCollab: CollabState | null = null

function getOrCreateCollab(note: NoteData, profile: UserProfile): CollabState {
  if (activeCollab && activeCollab.noteId === note.id) return activeCollab
  activeCollab?.provider.destroy()
  activeCollab?.ydoc.destroy()
  const ydoc = new Y.Doc()
  if (note.yjs_state) Y.applyUpdate(ydoc, fromBase64(note.yjs_state))
  const supabase = createClient()
  const provider = new SupabaseProvider({ doc: ydoc, supabase, channelName: note.id })
  provider.setUser({ name: profile.full_name ?? profile.email, color: getUserColor(profile.id) })
  activeCollab = { noteId: note.id, ydoc, provider }
  return activeCollab
}

export default function NoteView({ note, role, profile, kanbanColumns = [] }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { ydoc, provider } = getOrCreateCollab(note, profile)

  const [title, setTitle] = useState(note.title)
  const [dmOnly, setDmOnly] = useState(note.dm_only)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [imageError, setImageError] = useState<string | null>(null)

  const canToggleDm = role === 'owner' || role === 'dm'

  async function handleDmToggle() {
    const next = !dmOnly
    setDmOnly(next)
    await setNoteDmOnly(note.id, note.workspace_id, next)
  }

  const titleTimer = useRef<ReturnType<typeof setTimeout>>()
  const snapTimer  = useRef<ReturnType<typeof setTimeout>>()
  const editorRef  = useRef<ReturnType<typeof useEditor>>(null)

  const flushSnapshot = useCallback(async () => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    setSaveStatus('saving')
    try {
      const yjsState = toBase64(Y.encodeStateAsUpdate(ydoc))
      const body = ed.storage.markdown?.getMarkdown?.() ?? ''
      const { error } = await supabase.from('notes').update({ yjs_state: yjsState, body }).eq('id', note.id)
      setSaveStatus(error ? 'unsaved' : 'saved')
      if (error) console.error('Save failed:', error)
    } catch (err) {
      console.error('Save threw:', err)
      setSaveStatus('unsaved')
    }
  }, [ydoc, supabase, note.id])

  useEffect(() => {
    function handleDocUpdate() {
      setSaveStatus('unsaved')
      clearTimeout(snapTimer.current)
      snapTimer.current = setTimeout(flushSnapshot, 2000)
    }
    ydoc.on('update', handleDocUpdate)
    return () => { ydoc.off('update', handleDocUpdate); clearTimeout(snapTimer.current) }
  }, [ydoc, flushSnapshot])

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${note.workspace_id}/images/${crypto.randomUUID()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('workspaces').upload(path, file, { contentType: file.type })
    if (uploadErr) throw uploadErr
    return supabase.storage.from('workspaces').getPublicUrl(path).data.publicUrl
  }

  async function insertImageUrl(url: string, pos?: number) {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed || !url) return
    if (pos !== undefined) {
      ed.chain().focus().insertContentAt(pos, { type: 'image', attrs: { src: url } }).run()
    } else {
      ed.chain().focus().setImage({ src: url }).run()
    }
    clearTimeout(snapTimer.current)
    await flushSnapshot()
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ history: false }),
      Markdown.configure({ html: false, tightLists: true, bulletListMarker: '-' }),
      ImageExt.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({ provider }),
    ],
    editorProps: {
      attributes: { class: 'prose prose-invert max-w-none focus:outline-none min-h-[60vh] py-1' },
      handlePaste(_view, event) {
        const items = Array.from(event.clipboardData?.items ?? [])
        const img = items.find((i) => i.type.startsWith('image/'))
        if (!img) return false
        event.preventDefault()
        const file = img.getAsFile()
        if (!file) return false
        uploadImage(file).then((url) => insertImageUrl(url)).catch((err) => { console.error(err); setImageError('Image upload failed') })
        return true
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false
        const files = Array.from(event.dataTransfer?.files ?? [])
        const img = files.find((f) => f.type.startsWith('image/'))
        if (!img) return false
        event.preventDefault()
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        uploadImage(img).then((url) => insertImageUrl(url, pos)).catch((err) => { console.error(err); setImageError('Image upload failed') })
        return true
      },
    },
  })

  useEffect(() => { editorRef.current = editor }, [editor])
  useEffect(() => { if (!editor || note.yjs_state || !note.body) return; editor.commands.setContent(note.body) }, [editor]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setTitle(note.title); setSaveStatus('saved') }, [note.id, note.title])

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setTitle(val)
    setSaveStatus('unsaved')
    clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(async () => {
      await supabase.from('notes').update({ title: val }).eq('id', note.id)
      setSaveStatus('saved')
      router.refresh()
    }, 500)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); editor?.commands.focus('start') }
  }

  const canEdit = role !== 'player' || !note.dm_only

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Title + meta bar */}
      <div className="px-10 pt-8 pb-3 flex-shrink-0">
        <div className="flex items-start gap-3">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            disabled={!canEdit}
            placeholder="Untitled"
            className="flex-1 min-w-0 bg-transparent text-3xl font-bold text-white placeholder-slate-700 focus:outline-none disabled:cursor-default"
          />
          <div className="flex items-center gap-3 pt-2.5 flex-shrink-0">
            {(canToggleDm || dmOnly) && (
              <div className="flex items-center gap-1.5" title={canToggleDm ? (dmOnly ? 'DM only — click to make visible to all' : 'Click to make DM-only') : 'DM only'}>
                <LockIcon className={`h-3 w-3 flex-shrink-0 ${dmOnly ? 'text-orange-400' : 'text-slate-600'}`} />
                <span className={`text-xs ${dmOnly ? 'text-orange-400' : 'text-slate-600'}`}>DM only</span>
                {canToggleDm && (
                  <button
                    role="switch"
                    aria-checked={dmOnly}
                    onClick={handleDmToggle}
                    className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 focus:outline-none ${
                      dmOnly ? 'bg-orange-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform duration-150 ${dmOnly ? 'translate-x-3' : 'translate-x-0'}`} />
                  </button>
                )}
              </div>
            )}
            <PresenceBar provider={provider} />
            <span className={`text-xs tabular-nums transition-colors ${
              saveStatus === 'saved' ? 'text-slate-600' : saveStatus === 'saving' ? 'text-slate-500' : 'text-orange-500/80'
            }`}>
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved'}
            </span>
          </div>
        </div>
      </div>

      {/* Formatting toolbar */}
      {editor && (
        <Toolbar
          editor={editor}
          onImageFile={canEdit ? (file) => uploadImage(file).then((url) => insertImageUrl(url)).catch((err) => { console.error(err); setImageError('Image upload failed') }) : undefined}
        />
      )}

      {imageError && (
        <div className="mx-10 mb-2 px-3 py-2 rounded-md bg-red-900/40 text-red-300 text-xs flex items-center justify-between flex-shrink-0">
          {imageError}
          <button onClick={() => setImageError(null)} className="ml-2 hover:text-red-100">✕</button>
        </div>
      )}

      {/* Editor + bottom panels */}
      <div className="flex-1 overflow-y-auto px-10 py-4">
        <EditorContent editor={editor} />
        <div className="mt-6 pt-5 border-t border-[#334155] flex gap-10">
          <div className="flex-1 min-w-0">
            <NoteLinksPanel noteId={note.id} workspaceId={note.workspace_id} canEdit={canEdit} />
          </div>
          <div className="w-56 flex-shrink-0 flex flex-col gap-6">
            <TagsPanel noteId={note.id} workspaceId={note.workspace_id} canEdit={canEdit} />
            <BoardPanel
              noteId={note.id}
              workspaceId={note.workspace_id}
              kanbanColumns={kanbanColumns}
              initialKanbanColumnId={note.kanban_column_id ?? null}
              initialOnTimeline={note.timeline_position != null}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  )
}
