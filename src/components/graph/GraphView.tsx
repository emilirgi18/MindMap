'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { getRecentUpdate, subscribeBoardUpdates } from '@/lib/boardSync'

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-slate-500 text-sm">
      Loading graph…
    </div>
  ),
})

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface GraphNode {
  id: string
  name: string
  dmOnly: boolean
  folderId: string | null
  val: number
}

export interface GraphLink {
  source: string
  target: string
}

export interface FolderLegendItem {
  id: string
  name: string
  color: string
  depth: number
}

interface Props {
  initialNodes: GraphNode[]
  initialLinks: GraphLink[]
  workspaceId: string
  folderColors: Record<string, string>
  folderLegend: FolderLegendItem[]
  hasUnfolderedNotes: boolean
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export default function GraphView({
  initialNodes, initialLinks, workspaceId, folderColors, folderLegend, hasUnfolderedNotes,
}: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<import('@supabase/supabase-js').RealtimeChannel | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [nodes, setNodes] = useState<GraphNode[]>(initialNodes)
  const [links, setLinks] = useState<GraphLink[]>(initialLinks)

  const fetchGraph = useCallback(async () => {
    const supabase = createClient()
    const [{ data: notesData }, { data: linksData }] = await Promise.all([
      supabase
        .from('notes')
        .select('id, title, dm_only, folder_id')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null),
      supabase.from('note_links').select('source_id, target_id'),
    ])
    if (!notesData) return
    const noteIdSet = new Set(notesData.map((n) => n.id))
    const linkRows = (linksData ?? []).filter(
      (l) => noteIdSet.has(l.source_id) && noteIdSet.has(l.target_id),
    )
    const connectionCount = new Map<string, number>()
    for (const l of linkRows) {
      connectionCount.set(l.source_id, (connectionCount.get(l.source_id) ?? 0) + 1)
      connectionCount.set(l.target_id, (connectionCount.get(l.target_id) ?? 0) + 1)
    }
    setNodes(notesData.map((n) => ({
      id: n.id,
      name: n.title || 'Untitled',
      dmOnly: n.dm_only,
      folderId: n.folder_id ?? null,
      val: Math.max(1, connectionCount.get(n.id) ?? 1),
    })))
    setLinks(linkRows.map((l) => ({ source: l.source_id, target: l.target_id })))
  }, [workspaceId])

  useEffect(() => {
    function update() {
      if (!containerRef.current) return
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    fetchGraph()
    const recentUpdate = getRecentUpdate(workspaceId)
    const timer = setTimeout(fetchGraph, recentUpdate ? 500 : 2000)
    const unsub = subscribeBoardUpdates(workspaceId, fetchGraph)
    return () => { clearTimeout(timer); unsub() }
  }, [workspaceId, fetchGraph])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`workspace-sync-${workspaceId}`, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'refresh' }, () => {
        console.log('[Graph Realtime] broadcast refresh received')
        fetchGraph()
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const { eventType } = payload
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row = (payload.new ?? {}) as any
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const oldRow = (payload.old ?? {}) as any

          const removeNode = (id: string) => {
            setNodes((prev) => prev.filter((n) => n.id !== id))
            setLinks((prev) => prev.filter((l) => {
              const src = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source
              const tgt = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target
              return src !== id && tgt !== id
            }))
          }

          if (eventType === 'DELETE') { removeNode(oldRow.id); return }
          if (row.deleted_at) { removeNode(row.id); return }

          setNodes((prev) => {
            const exists = prev.some((n) => n.id === row.id)
            if (exists) {
              return prev.map((n) => n.id === row.id
                ? { ...n, name: row.title || 'Untitled', dmOnly: row.dm_only, folderId: row.folder_id ?? null }
                : n)
            }
            return [...prev, { id: row.id, name: row.title || 'Untitled', dmOnly: row.dm_only, folderId: row.folder_id ?? null, val: 1 }]
          })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'note_links' },
        (payload) => {
          const { eventType } = payload
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row = (payload.new ?? {}) as any
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const oldRow = (payload.old ?? {}) as any

          if (eventType === 'INSERT') {
            setNodes((prev) => prev.map((n) =>
              n.id === row.source_id || n.id === row.target_id ? { ...n, val: n.val + 1 } : n,
            ))
            setLinks((prev) => {
              const dup = prev.some((l) => {
                const src = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source
                const tgt = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target
                return src === row.source_id && tgt === row.target_id
              })
              return dup ? prev : [...prev, { source: row.source_id, target: row.target_id }]
            })
          } else if (eventType === 'DELETE') {
            setNodes((prev) => prev.map((n) =>
              n.id === oldRow.source_id || n.id === oldRow.target_id
                ? { ...n, val: Math.max(1, n.val - 1) }
                : n,
            ))
            setLinks((prev) => prev.filter((l) => {
              const src = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source
              const tgt = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target
              return !(src === oldRow.source_id && tgt === oldRow.target_id)
            }))
          }
        },
      )
      .subscribe((status, err) => {
        if (err) console.error('[Graph Realtime] error:', err)
        else if (status === 'SUBSCRIBED') console.log('[Graph Realtime] subscribed ✓')
        else if (status === 'CHANNEL_ERROR') console.error('[Graph Realtime] channel error')
        else if (status === 'TIMED_OUT') console.warn('[Graph Realtime] timed out')
      })

    channelRef.current = channel
    return () => { supabase.removeChannel(channel); channelRef.current = null }
  }, [workspaceId, fetchGraph])

  const handleNodeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => { router.push(`/workspace/${workspaceId}/note/${node.id}`) },
    [router, workspaceId]
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeColor = useCallback(
    (node: any) => (node.folderId ? (folderColors[node.folderId] ?? '#64748b') : '#64748b'),
    [folderColors]
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeLabel = useCallback((node: any) => node.name as string, [])

  const showLegend = folderLegend.length > 0 || hasUnfolderedNotes

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0f172a]">

      {/* Refresh button */}
      <button
        onClick={() => router.refresh()}
        title="Refresh graph"
        className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1e293b]/80 border border-[#334155] text-sm text-slate-500 hover:text-orange-400 hover:bg-slate-700/40 transition-colors backdrop-blur-sm"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
        </svg>
        Refresh
      </button>

      {/* Color legend */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 z-10 bg-[#1e293b]/90 border border-[#334155] rounded-lg px-3 py-2.5 backdrop-blur-sm max-h-64 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Folders</p>
          <ul className="space-y-1.5">
            {folderLegend.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2"
                style={{ paddingLeft: item.depth * 12 }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-300 truncate max-w-[140px]">{item.name}</span>
              </li>
            ))}
            {hasUnfolderedNotes && (
              <li className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[#64748b]" />
                <span className="text-xs text-slate-500 italic">No folder</span>
              </li>
            )}
          </ul>
        </div>
      )}

      {dimensions.width > 0 && (
        <ForceGraph3D
          graphData={{ nodes, links }}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#0f172a"
          nodeLabel={nodeLabel}
          nodeColor={nodeColor}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeVal={(node: any) => node.val}
          onNodeClick={handleNodeClick}
          linkColor={() => '#334155'}
          linkOpacity={0.7}
          nodeOpacity={0.95}
        />
      )}
    </div>
  )
}
