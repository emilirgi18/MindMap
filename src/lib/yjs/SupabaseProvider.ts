import * as Y from 'yjs'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness'
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import { toBase64, fromBase64 } from './utils'

interface ProviderOptions {
  doc: Y.Doc
  supabase: SupabaseClient
  channelName: string
  /** Called whenever the local Y.Doc is modified (use to debounce snapshot saves). */
  onUpdate?: () => void
}

export class SupabaseProvider {
  readonly doc: Y.Doc
  readonly awareness: Awareness

  private channel: RealtimeChannel
  private onUpdate?: () => void
  private destroyed = false

  constructor({ doc, supabase, channelName, onUpdate }: ProviderOptions) {
    this.doc = doc
    this.awareness = new Awareness(doc)
    this.onUpdate = onUpdate

    this.channel = supabase.channel(`collab:${channelName}`, {
      config: {
        broadcast: { self: false, ack: false },
      },
    })

    // Apply Yjs update diffs from remote peers
    this.channel.on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
      Y.applyUpdate(this.doc, fromBase64(payload.update as string), 'remote')
    })

    // Apply awareness updates from remote peers (cursor positions, user info)
    this.channel.on(
      'broadcast',
      { event: 'awareness' },
      ({ payload }) => {
        applyAwarenessUpdate(
          this.awareness,
          fromBase64(payload.update as string),
          'remote'
        )
      }
    )

    // Broadcast local Y.Doc updates to peers.
    // origin === 'remote' means it came from a peer — don't re-broadcast.
    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (this.destroyed) return
      if (origin === 'remote') return
      this.channel.send({
        type: 'broadcast',
        event: 'yjs-update',
        payload: { update: toBase64(update) },
      })
      this.onUpdate?.()
    })

    // Broadcast local awareness updates (cursor, user info) to peers
    this.awareness.on(
      'update',
      ({
        added,
        updated,
        removed,
      }: {
        added: number[]
        updated: number[]
        removed: number[]
      }) => {
        if (this.destroyed) return
        const clients = [...added, ...updated, ...removed]
        const encoded = encodeAwarenessUpdate(this.awareness, clients)
        this.channel.send({
          type: 'broadcast',
          event: 'awareness',
          payload: { update: toBase64(encoded) },
        })
      }
    )

    this.channel.subscribe()
  }

  setUser(user: { name: string; color: string }) {
    this.awareness.setLocalStateField('user', user)
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    // Remove self from peer awareness maps
    this.awareness.setLocalState(null)
    this.awareness.destroy()
    this.channel.unsubscribe()
  }
}
