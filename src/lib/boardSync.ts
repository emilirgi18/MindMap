'use client'

import { createClient } from './supabase/client'

// Send a Supabase Broadcast to every view subscribed to this workspace channel.
// Works across browser tabs without any database publication requirement.
export function broadcastRefresh(workspaceId: string) {
  const supabase = createClient()
  const ch = supabase.channel(`workspace-sync-${workspaceId}`, {
    config: { broadcast: { self: false } },
  })
  ch.subscribe((status) => {
    if (status !== 'SUBSCRIBED') return
    ch.send({ type: 'broadcast', event: 'refresh', payload: {} })
    setTimeout(() => supabase.removeChannel(ch), 1500)
  })
}

// In-process pub/sub for board updates.
// Works within a single browser tab — bridges the gap between when a server
// action completes and when the target view is mounted.

export interface BoardUpdate {
  workspaceId: string
  noteId: string
  timestamp: number
}

let _lastUpdate: BoardUpdate | null = null
const _listeners = new Set<(u: BoardUpdate) => void>()

export function notifyBoardUpdate(workspaceId: string, noteId: string) {
  const update: BoardUpdate = { workspaceId, noteId, timestamp: Date.now() }
  _lastUpdate = update
  _listeners.forEach((l) => l(update))
}

/** Returns the last update if it happened within the given window (ms). */
export function getRecentUpdate(workspaceId: string, withinMs = 15_000): BoardUpdate | null {
  if (!_lastUpdate) return null
  if (_lastUpdate.workspaceId !== workspaceId) return null
  if (Date.now() - _lastUpdate.timestamp > withinMs) return null
  return _lastUpdate
}

export function subscribeBoardUpdates(
  workspaceId: string,
  listener: (u: BoardUpdate) => void,
): () => void {
  const wrapped = (u: BoardUpdate) => { if (u.workspaceId === workspaceId) listener(u) }
  _listeners.add(wrapped)
  return () => _listeners.delete(wrapped)
}
