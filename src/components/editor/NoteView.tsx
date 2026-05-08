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
import type { EditorView } from '@tiptap/pm/view'
import { SupabaseProvider } from '@/lib/yjs/SupabaseProvider'
import { fromBase64, toBase64, getUserColor } from '@/lib/yjs/utils'
import { createClient } from '@/lib/supabase/client'
import Toolbar from './Toolbar'
import PresenceBar from './PresenceBar'
import NoteLinksPanel from './NoteLinksPanel'

interface NoteData {
  id: string
  title: string
  body: string
  yjs_state: string | null
  workspace_id: string
  dm_only: boolean
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
}

type SaveStatus = 'saved' | 'saving' | 'unsaved'

// ---------------------------------------------------------------------------
// Stable collab objects: Y.Doc + SupabaseProvider
// Created once per (note.id), destroyed on note change or unmount.
// Initialised synchronously before any hook so they are available to useEditor.
// ---------------------------------------------------------------------------

interface CollabState {
  noteId: string
  ydoc: Y.Doc
  provider: SupabaseProvider
}

let activeCollab: CollabState | null = null

function getOrCreateCollab(
  note: NoteData,
  profile: UserProfile
): CollabState {
  // Reuse if same note, otherwise tear down and recreate
  if (activeCollab && activeCollab.noteId === note.id) return activeCollab

  activeCollab?.provider.destroy()
  activeCollab?.ydoc.destroy()

  const ydoc = new Y.Doc()

  // Restore snapshot from DB if it exists; otherwise the doc starts empty
  if (note.yjs_state) {
    Y.applyUpdate(ydoc, fromBase64(note.yjs_state))
  }

  const supabase = createClient()
  const provider = new SupabaseProvider({
    doc: ydoc,
    supabase,
    channelName: note.id,
  })
  provider.setUser({
    name: profile.full_name ?? profile.email,
    color: getUserColor(profile.id),
  })

  activeCollab = { noteId: note.id, ydoc, provider }
  return activeCollab
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NoteView({ note, role, profile }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // Collab objects — stable across re-renders for the same note
  const { ydoc, provider } = getOrCreateCollab(note, profile)

  const [title, setTitle] = useState(note.title)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')

  const titleTimer = useRef<ReturnType<typeof setTimeout>>()
  const snapTimer = useRef<ReturnType<typeof setTimeout>>()
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)

  // ----- Snapshot flush (Yjs → Postgres) -----------------------------------

  const flushSnapshot = useCallback(async () => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    setSaveStatus('saving')
    const yjsState = toBase64(Y.encodeStateAsUpdate(ydoc))
    const body = ed.storage.markdown.getMarkdown() as string
    const { error } = await supabase
      .from('notes')
      .update({ yjs_state: yjsState, body })
      .eq('id', note.id)
    if (!error) {
      setSaveStatus('saved')
      router.refresh()
    }
  }, [ydoc, supabase, note.id, router])

  // Debounce snapshot saves triggered by Y.Doc updates
  useEffect(() => {
    function handleDocUpdate(_update: Uint8Array, origin: unknown) {
      if (origin === 'remote') {
        // Remote update — still needs to be snapshotted eventually
      }
      setSaveStatus('unsaved')
      clearTimeout(snapTimer.current)
      snapTimer.current = setTimeout(flushSnapshot, 2000)
    }

    ydoc.on('update', handleDocUpdate)
    return () => {
      ydoc.off('update', handleDocUpdate)
      clearTimeout(snapTimer.current)
    }
  }, [ydoc, flushSnapshot])

  // Destroy the collab session when the component unmounts
  useEffect(() => {
    return () => {
      if (activeCollab?.noteId === note.id) {
        activeCollab.provider.destroy()
        activeCollab.ydoc.destroy()
        activeCollab = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----- Image upload -------------------------------------------------------

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${note.workspace_id}/images/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from('workspaces')
      .upload(path, file, { contentType: file.type })
    if (error) throw error
    // Signed URL valid for 1 year — stored verbatim in Markdown
    const { data } = await supabase.storage
      .from('workspaces')
      .createSignedUrl(path, 60 * 60 * 24 * 365)
    return data?.signedUrl ?? ''
  }

  function insertImage(view: EditorView, url: string, pos?: number) {
    const { schema, tr } = view.state
    const node = schema.nodes.image.create({ src: url })
    view.dispatch(pos !== undefined ? tr.insert(pos, node) : tr.replaceSelectionWith(node))
  }

  // ----- TipTap editor ------------------------------------------------------

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Disable built-in history — Yjs provides undo/redo via Y.UndoManager
      StarterKit.configure({ history: false }),
      Markdown.configure({ html: false, tightLists: true, bulletListMarker: '-' }),
      ImageExt.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      // Bind editor to the shared Y.Doc (uses the default XML fragment)
      Collaboration.configure({ document: ydoc }),
      // Show remote cursors
      CollaborationCursor.configure({ provider }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[60vh] py-1',
      },
      handlePaste(view, event) {
        const items = Array.from(event.clipboardData?.items ?? [])
        const img = items.find((i) => i.type.startsWith('image/'))
        if (!img) return false
        event.preventDefault()
        const file = img.getAsFile()
        if (!file) return false
        uploadImage(file).then((url) => url && insertImage(view, url)).catch(console.error)
        return true
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false
        const files = Array.from(event.dataTransfer?.files ?? [])
        const img = files.find((f) => f.type.startsWith('image/'))
        if (!img) return false
        event.preventDefault()
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
        uploadImage(img).then((url) => url && insertImage(view, url, coords?.pos)).catch(console.error)
        return true
      },
    },
  })

  // Keep editorRef in sync so flushSnapshot can read the editor without deps
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Bootstrap editor from Markdown body if there is no Yjs snapshot yet
  // (handles notes created before Yjs was enabled)
  useEffect(() => {
    if (!editor || note.yjs_state || !note.body) return
    editor.commands.setContent(note.body)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  // Reset title when navigating between notes
  useEffect(() => {
    setTitle(note.title)
    setSaveStatus('saved')
  }, [note.id, note.title])

  // ----- Title handler ------------------------------------------------------

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
    if (e.key === 'Enter') {
      e.preventDefault()
      editor?.commands.focus('start')
    }
  }

  // ----- Render -------------------------------------------------------------

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
            className="flex-1 min-w-0 bg-transparent text-3xl font-bold text-white placeholder-gray-700 focus:outline-none disabled:cursor-default"
          />
          <div className="flex items-center gap-3 pt-2.5 flex-shrink-0">
            {note.dm_only && (
              <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                <LockIcon className="h-3 w-3" />
                DM only
              </span>
            )}
            <PresenceBar provider={provider} />
            <span
              className={`text-xs tabular-nums transition-colors ${
                saveStatus === 'saved'
                  ? 'text-gray-700'
                  : saveStatus === 'saving'
                  ? 'text-gray-500'
                  : 'text-amber-500/80'
              }`}
            >
              {saveStatus === 'saved'
                ? 'Saved'
                : saveStatus === 'saving'
                ? 'Saving…'
                : 'Unsaved'}
            </span>
          </div>
        </div>
      </div>

      {/* Formatting toolbar */}
      {editor && <Toolbar editor={editor} />}

      {/* Editor + links panel */}
      <div className="flex-1 overflow-y-auto px-10 py-4">
        <EditorContent editor={editor} />
        <NoteLinksPanel
          noteId={note.id}
          workspaceId={note.workspace_id}
          canEdit={canEdit}
        />
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
