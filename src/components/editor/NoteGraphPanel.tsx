'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import type { NodeObject, LinkObject } from 'react-force-graph-2d'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-slate-500 text-xs">
      Loading…
    </div>
  ),
})

interface Props {
  noteId: string
  workspaceId: string
}

interface EgoNode {
  id: string
  name: string
  hop: number
  val: number
}

interface EgoLink {
  source: string
  target: string
}

const DEPTH_OPTIONS = [2, 3, 4] as const

const HOP_COLORS = ['#f97316', '#fb923c', '#fbbf24', '#94a3b8']

// BFS over the undirected link graph, capped at `depth` hops from `rootId`.
function buildEgoGraph(
  rootId: string,
  noteTitles: Map<string, string>,
  adjacency: Map<string, Set<string>>,
  depth: number,
): { nodes: EgoNode[]; links: EgoLink[] } {
  const hopOf = new Map<string, number>([[rootId, 0]])
  const queue: string[] = [rootId]

  while (queue.length > 0) {
    const current = queue.shift() as string
    const hop = hopOf.get(current) ?? 0
    if (hop >= depth) continue
    for (const neighbor of Array.from(adjacency.get(current) ?? [])) {
      if (hopOf.has(neighbor)) continue
      hopOf.set(neighbor, hop + 1)
      queue.push(neighbor)
    }
  }

  const nodes: EgoNode[] = Array.from(hopOf.entries()).map(([id, hop]) => ({
    id,
    name: noteTitles.get(id) ?? 'Untitled',
    hop,
    val: hop === 0 ? 6 : Math.max(1, 4 - hop),
  }))

  const links: EgoLink[] = []
  const seen = new Set<string>()
  for (const id of Array.from(hopOf.keys())) {
    for (const neighbor of Array.from(adjacency.get(id) ?? [])) {
      if (!hopOf.has(neighbor)) continue
      const key = [id, neighbor].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      links.push({ source: id, target: neighbor })
    }
  }

  return { nodes, links }
}

export default function NoteGraphPanel({ noteId, workspaceId }: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [depth, setDepth] = useState<number>(DEPTH_OPTIONS[0])
  const [noteTitles, setNoteTitles] = useState<Map<string, string>>(new Map())
  const [adjacency, setAdjacency] = useState<Map<string, Set<string>>>(new Map())

  const fetchGraph = useCallback(async () => {
    const supabase = createClient()
    const [{ data: notesData }, { data: linksData }] = await Promise.all([
      supabase.from('notes').select('id, title').eq('workspace_id', workspaceId).is('deleted_at', null),
      supabase.from('note_links').select('source_id, target_id'),
    ])
    if (!notesData) return
    const idSet = new Set(notesData.map((n) => n.id))
    const titles = new Map(notesData.map((n) => [n.id, n.title || 'Untitled']))
    const adj = new Map<string, Set<string>>()
    const addEdge = (a: string, b: string) => {
      if (!adj.has(a)) adj.set(a, new Set())
      adj.get(a)!.add(b)
    }
    for (const l of linksData ?? []) {
      if (!idSet.has(l.source_id) || !idSet.has(l.target_id)) continue
      addEdge(l.source_id, l.target_id)
      addEdge(l.target_id, l.source_id)
    }
    setNoteTitles(titles)
    setAdjacency(adj)
  }, [workspaceId])

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`workspace-sync-${workspaceId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'refresh' }, () => fetchGraph())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [workspaceId, fetchGraph])

  useEffect(() => {
    function update() {
      if (!containerRef.current) return
      setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const { nodes, links } = buildEgoGraph(noteId, noteTitles, adjacency, depth)

  const handleNodeClick = useCallback(
    (node: NodeObject) => {
      if (node.id === noteId) return
      router.push(`/workspace/${workspaceId}/note/${node.id as string}`)
    },
    [router, workspaceId, noteId],
  )

  const nodeColor = useCallback(
    (node: NodeObject) => HOP_COLORS[Math.min(node.hop as number, HOP_COLORS.length - 1)],
    [],
  )

  const nodeLabel = useCallback((node: NodeObject) => node.name as string, [])

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col bg-[#1a2332] border border-[#334155] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 h-10 border-b border-[#334155] flex-shrink-0">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Linked graph</span>
        <div className="flex items-center gap-0.5">
          {DEPTH_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDepth(d)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                depth === d ? 'bg-orange-500/20 text-orange-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0">
        {dimensions.width > 0 && (
          <ForceGraph2D
            graphData={{ nodes, links }}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="#1a2332"
            nodeLabel={nodeLabel}
            nodeColor={nodeColor}
            nodeVal={(node: NodeObject) => node.val as number}
            onNodeClick={handleNodeClick}
            linkColor={() => 'rgba(51, 65, 85, 0.7)'}
          />
        )}
      </div>
    </aside>
  )
}
