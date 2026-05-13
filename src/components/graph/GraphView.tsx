'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

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
  nodes: GraphNode[]
  links: GraphLink[]
  workspaceId: string
  folderColors: Record<string, string>
  folderLegend: FolderLegendItem[]
  hasUnfolderedNotes: boolean
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export default function GraphView({
  nodes, links, workspaceId, folderColors, folderLegend, hasUnfolderedNotes,
}: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

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
