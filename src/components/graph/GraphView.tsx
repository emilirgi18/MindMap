'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import type { NodeObject, LinkObject } from 'react-force-graph-3d'

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

// After the force simulation runs, the library mutates link.source/target
// from string IDs to the actual node objects.
type RuntimeNode = GraphNode & { x?: number; y?: number; z?: number }
type RuntimeLink = { source: RuntimeNode | string; target: RuntimeNode | string }

type NoteRow = { id: string; title: string; dm_only: boolean; folder_id: string | null; deleted_at: string | null }
type LinkRow  = { source_id: string; target_id: string }

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
  hiddenFolderIds: Set<string>
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export default function GraphView({
  initialNodes, initialLinks, workspaceId, folderColors, hiddenFolderIds,
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
    const timer = setTimeout(fetchGraph, 2000)
    return () => clearTimeout(timer)
  }, [workspaceId, fetchGraph])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`workspace-sync-${workspaceId}`, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'refresh' }, () => {
        fetchGraph()
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const { eventType } = payload
          const row = (payload.new ?? {}) as Partial<NoteRow>
          const oldRow = (payload.old ?? {}) as Partial<NoteRow>

          const removeNode = (id: string) => {
            setNodes((prev) => prev.filter((n) => n.id !== id))
            setLinks((prev) => (prev as unknown as RuntimeLink[]).filter((l) => {
              const src = typeof l.source === 'object' ? l.source.id : l.source
              const tgt = typeof l.target === 'object' ? l.target.id : l.target
              return src !== id && tgt !== id
            }) as unknown as GraphLink[])
          }

          if (eventType === 'DELETE') { if (oldRow.id) removeNode(oldRow.id); return }
          if (row.deleted_at) { if (row.id) removeNode(row.id); return }

          if (!row.id) return
          // Capture narrowed values before entering the closure
          const nodeId = row.id
          const nodeName = row.title || 'Untitled'
          const nodeDmOnly = !!row.dm_only
          const nodeFolderId = row.folder_id ?? null
          setNodes((prev) => {
            const exists = prev.some((n) => n.id === nodeId)
            if (exists) {
              return prev.map((n) => n.id === nodeId
                ? { ...n, name: nodeName, dmOnly: nodeDmOnly, folderId: nodeFolderId }
                : n)
            }
            return [...prev, { id: nodeId, name: nodeName, dmOnly: nodeDmOnly, folderId: nodeFolderId, val: 1 }]
          })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'note_links' },
        (payload) => {
          const { eventType } = payload
          const row = (payload.new ?? {}) as Partial<LinkRow>
          const oldRow = (payload.old ?? {}) as Partial<LinkRow>

          if (eventType === 'INSERT' && row.source_id && row.target_id) {
            const { source_id: srcId, target_id: tgtId } = row as LinkRow
            setNodes((prev) => prev.map((n) =>
              n.id === srcId || n.id === tgtId ? { ...n, val: n.val + 1 } : n,
            ))
            setLinks((prev) => {
              const dup = (prev as unknown as RuntimeLink[]).some((l) => {
                const src = typeof l.source === 'object' ? l.source.id : l.source
                const tgt = typeof l.target === 'object' ? l.target.id : l.target
                return src === srcId && tgt === tgtId
              })
              return dup ? prev : [...prev, { source: srcId, target: tgtId }]
            })
          } else if (eventType === 'DELETE' && oldRow.source_id && oldRow.target_id) {
            const { source_id: srcId, target_id: tgtId } = oldRow as LinkRow
            setNodes((prev) => prev.map((n) =>
              n.id === srcId || n.id === tgtId
                ? { ...n, val: Math.max(1, n.val - 1) }
                : n,
            ))
            setLinks((prev) => (prev as unknown as RuntimeLink[]).filter((l) => {
              const src = typeof l.source === 'object' ? l.source.id : l.source
              const tgt = typeof l.target === 'object' ? l.target.id : l.target
              return !(src === srcId && tgt === tgtId)
            }) as unknown as GraphLink[])
          }
        },
      )
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel); channelRef.current = null }
  }, [workspaceId, fetchGraph])

  const handleNodeClick = useCallback(
    (node: NodeObject) => { router.push(`/workspace/${workspaceId}/note/${node.id as string}`) },
    [router, workspaceId]
  )

  const nodeColor = useCallback(
    (node: NodeObject) => {
      const folderId = node.folderId as string | null | undefined
      return folderId ? (folderColors[folderId] ?? '#64748b') : '#64748b'
    },
    [folderColors]
  )

  const nodeLabel = useCallback((node: NodeObject) => node.name as string, [])

  const nodeVisibility = useCallback(
    (node: NodeObject) => !hiddenFolderIds.has((node.folderId as string | null) ?? '__no-folder__'),
    [hiddenFolderIds]
  )

  const linkVisibility = useCallback(
    (link: LinkObject) => {
      const src = typeof link.source === 'object' && link.source !== null ? link.source as NodeObject : null
      const tgt = typeof link.target === 'object' && link.target !== null ? link.target as NodeObject : null
      return (
        !hiddenFolderIds.has((src?.folderId as string | null | undefined) ?? '__no-folder__') &&
        !hiddenFolderIds.has((tgt?.folderId as string | null | undefined) ?? '__no-folder__')
      )
    },
    [hiddenFolderIds]
  )

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0f172a]">
      {dimensions.width > 0 && (
        <ForceGraph3D
          graphData={{ nodes, links }}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#0f172a"
          nodeLabel={nodeLabel}
          nodeColor={nodeColor}
          nodeVal={(node: NodeObject) => node.val as number}
          nodeVisibility={nodeVisibility}
          linkVisibility={linkVisibility}
          onNodeClick={handleNodeClick}
          linkColor={() => '#334155'}
          linkOpacity={0.7}
          nodeOpacity={0.95}
        />
      )}
    </div>
  )
}
