'use client'

import { Node, InputRule, mergeAttributes, type InputRuleMatch } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WikilinkAttrs {
  title: string
  noteId: string | null
  href: string | null
}

interface WikilinkOptions {
  workspaceId: string
  sourceNoteId: string
}

// ---------------------------------------------------------------------------
// React node view
// ---------------------------------------------------------------------------

function WikilinkView({ node, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as WikilinkAttrs
  const router = useRouter()
  const supabase = createClient()
  const [resolving, setResolving] = useState(!attrs.noteId)
  const didResolve = useRef(false)

  const { title, noteId, href } = attrs

  useEffect(() => {
    if (noteId || didResolve.current) return
    didResolve.current = true

    async function resolve() {
      // Read workspaceId from a data attribute on the editor root element
      // (injected via editorProps.attributes in NoteView)
      const editorEl = document.querySelector('[data-workspace-id]')
      const workspaceId = editorEl?.getAttribute('data-workspace-id') ?? ''
      const sourceNoteId = editorEl?.getAttribute('data-note-id') ?? ''

      if (!workspaceId) return

      // Look up existing note by title (case-insensitive)
      let { data: existing } = await supabase
        .from('notes')
        .select('id')
        .eq('workspace_id', workspaceId)
        .ilike('title', title)
        .maybeSingle()

      let resolvedId = existing?.id ?? null

      // Create stub note if none found
      if (!resolvedId) {
        const { data: created } = await supabase
          .from('notes')
          .insert({ workspace_id: workspaceId, title, body: '' })
          .select('id')
          .single()
        resolvedId = created?.id ?? null
      }

      if (!resolvedId) {
        setResolving(false)
        return
      }

      const resolvedHref = `/workspace/${workspaceId}/note/${resolvedId}`

      // Upsert note_links row
      if (sourceNoteId) {
        await supabase.from('note_links').upsert(
          { source_id: sourceNoteId, target_id: resolvedId },
          { onConflict: 'source_id,target_id', ignoreDuplicates: true }
        )
      }

      updateAttributes({ noteId: resolvedId, href: resolvedHref })
      setResolving(false)
    }

    resolve().catch(console.error)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    if (href) router.push(href)
  }

  return (
    <NodeViewWrapper as="span" className="wikilink-wrapper">
      {resolving || !href ? (
        <span className="text-gray-500 cursor-default">[[{title}]]</span>
      ) : (
        <a
          href={href}
          onClick={handleClick}
          className="text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
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

// Match [[...]] at end of input but not inside an existing wikilink
const WIKILINK_INPUT_REGEX = /\[\[([^\[\]\n]+)\]\]$/

export const WikilinkExtension = Node.create<WikilinkOptions>({
  name: 'wikilink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { workspaceId: '', sourceNoteId: '' }
  },

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
          // Return the transaction so TipTap applies it atomically.
          // Using chain() here dispatches independently and returns null,
          // which causes TipTap to revert the insertion.
          return state.tr.replaceWith(range.from, range.to, wikiNode)
        },
      }),
    ]
  },

  // Serialize back to [[title]] in Markdown
  addStorage() {
    return {
      markdown: {
        serialize(state: { write: (s: string) => void }, node: { attrs: WikilinkAttrs }) {
          state.write(`[[${node.attrs.title}]]`)
        },
        parse: {
          // Handled by parseHTML when loading from body
        },
      },
    }
  },
})
