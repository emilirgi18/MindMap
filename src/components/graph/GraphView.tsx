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
    <div ref={containerRef} className="w-full h-full bg-[#0f1117]">
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
