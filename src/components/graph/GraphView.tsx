'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Lazy-load the 3D graph — it pulls in Three.js and must not run on the server
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
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
  val: number
}

export interface GraphLink {
  source: string
  target: string
}

interface Props {
  nodes: GraphNode[]
  links: GraphLink[]
  workspaceId: string
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export default function GraphView({ nodes, links, workspaceId }: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Measure container so the graph fills it exactly
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
    (node: any) => {
      router.push(`/workspace/${workspaceId}/note/${node.id}`)
    },
    [router, workspaceId]
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeColor = useCallback((node: any) => (node.dmOnly ? '#f59e0b' : '#6366f1'), [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeLabel = useCallback((node: any) => node.name as string, [])

  const graphData = { nodes, links }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0f1117]">
      <button
        onClick={() => router.refresh()}
        title="Refresh graph"
        className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#161b27]/80 border border-[#2a3347] text-xs text-gray-400 hover:text-gray-200 hover:bg-[#1c2333] transition-colors backdrop-blur-sm"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
        </svg>
        Refresh
      </button>
      {dimensions.width > 0 && (
        <ForceGraph3D
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#0f1117"
          nodeLabel={nodeLabel}
          nodeColor={nodeColor}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeVal={(node: any) => node.val}
          onNodeClick={handleNodeClick}
          linkColor={() => '#2a3347'}
          linkOpacity={0.6}
          nodeOpacity={0.9}
        />
      )}
    </div>
  )
}
