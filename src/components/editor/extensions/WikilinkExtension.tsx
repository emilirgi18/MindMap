'use client'

import { Node, InputRule, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { broadcastRefresh } from '@/lib/boardSync'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WikilinkAttrs {
  title: string
  noteId: string | null
  href: string | null
}

// ---------------------------------------------------------------------------
// React node view
// ---------------------------------------------------------------------------

function WikilinkView({ node, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as WikilinkAttrs
  const router = useRouter()
  const supabase = createClient()
  const [resolving, setResolving] = useState(!attrs.noteId)
  const [creating, setCreating] = useState(false)
  const didResolve = useRef(false)

  const { title, noteId, href } = attrs

  useEffect(() => {
    if (noteId || didResolve.current) return
    didResolve.current = true

    async function resolve() {
      const editorEl = document.querySelector('[data-workspace-id]')
      const workspaceId = editorEl?.getAttribute('data-workspace-id') ?? ''
      const sourceNoteId = editorEl?.getAttribute('data-note-id') ?? ''

      if (!workspaceId) { setResolving(false); return }

      const { data: existing } = await supabase
        .from('notes')
        .select('id')
        .eq('workspace_id', workspaceId)
        .ilike('title', title)
        .is('deleted_at', null)
        .maybeSingle()

      if (!existing) {
        // Note doesn't exist — show as unresolved, don't auto-create
        setResolving(false)
        return
      }

      const resolvedHref = `/workspace/${workspaceId}/note/${existing.id}`

      if (sourceNoteId) {
        await supabase.from('note_links').upsert(
          { source_id: sourceNoteId, target_id: existing.id },
          { onConflict: 'source_id,target_id', ignoreDuplicates: true },
        )
        broadcastRefresh(workspaceId)
      }

      updateAttributes({ noteId: existing.id, href: resolvedHref })
      setResolving(false)
    }

    resolve().catch(console.error)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    if (href) router.push(href)
  }

  async function handleCreate(e: React.MouseEvent) {
    e.preventDefault()
    const editorEl = document.querySelector('[data-workspace-id]')
    const workspaceId = editorEl?.getAttribute('data-workspace-id') ?? ''
    const sourceNoteId = editorEl?.getAttribute('data-note-id') ?? ''
    if (!workspaceId) return

    setCreating(true)
    const { data: created } = await supabase
      .from('notes')
      .insert({ workspace_id: workspaceId, title, body: '' })
      .select('id')
      .single()

    if (!created) { setCreating(false); return }

    const resolvedHref = `/workspace/${workspaceId}/note/${created.id}`

    if (sourceNoteId) {
      await supabase.from('note_links').upsert(
        { source_id: sourceNoteId, target_id: created.id },
        { onConflict: 'source_id,target_id', ignoreDuplicates: true },
      )
    }

    broadcastRefresh(workspaceId)
    updateAttributes({ noteId: created.id, href: resolvedHref })
    router.push(resolvedHref)
  }

  return (
    <NodeViewWrapper as="span" className="wikilink-wrapper">
      {resolving ? (
        <span className="text-slate-500 cursor-default animate-pulse">[[{title}]]</span>
      ) : !href ? (
        <button
          onClick={handleCreate}
          disabled={creating}
          title="Note not found — click to create it"
          className="text-slate-500 hover:text-orange-400 underline decoration-dashed underline-offset-2 cursor-pointer transition-colors disabled:opacity-50"
        >
          [[{title}]]
        </button>
      ) : (
        <a
          href={href}
          onClick={handleClick}
          className="text-orange-400 hover:text-orange-300 hover:underline cursor-pointer"
          data-wikilink={title}
        >
          [[{title}]]
        </a>
      )}
    </NodeViewWrapper>
  )
}

// ---------------------------------------------------------------------------
// TipTap extension
// ---------------------------------------------------------------------------

const WIKILINK_INPUT_REGEX = /\[\[([^\[\]\n]+)\]\]$/

export const WikilinkExtension = Node.create({
  name: 'wikilink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      title: { default: '' },
      noteId: { default: null },
      href: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wikilink]',
        getAttrs: (el) => {
          const span = el as HTMLElement
          return {
            title: span.getAttribute('data-wikilink') ?? '',
            noteId: span.getAttribute('data-note-id') ?? null,
            href: span.getAttribute('data-href') ?? null,
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-wikilink': HTMLAttributes.title,
        'data-note-id': HTMLAttributes.noteId,
        'data-href': HTMLAttributes.href,
        class: 'wikilink',
      }),
      `[[${HTMLAttributes.title}]]`,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikilinkView)
  },

  addInputRules() {
    return [
      new InputRule({
        find: WIKILINK_INPUT_REGEX,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: ({ state, range, match }: any) => {
          const title = (match[1] as string | undefined)?.trim()
          if (!title) return null
          const wikiNode = this.type.create({ title, noteId: null, href: null })
          return state.tr.replaceWith(range.from, range.to, wikiNode)
        },
      }),
    ]
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: { write: (s: string) => void }, node: { attrs: WikilinkAttrs }) {
          state.write(`[[${node.attrs.title}]]`)
        },
        parse: {},
      },
    }
  },
})
