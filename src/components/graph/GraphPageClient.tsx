'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import GraphView, { type GraphNode, type GraphLink, type FolderLegendItem } from './GraphView'

interface Props {
  initialNodes: GraphNode[]
  initialLinks: GraphLink[]
  workspaceId: string
  folderColors: Record<string, string>
  folderLegend: FolderLegendItem[]
  hasUnfolderedNotes: boolean
  nodeCount: number
  linkCount: number
  atNodeLimit: boolean
  nodeLimit: number
}

export default function GraphPageClient({
  initialNodes, initialLinks, workspaceId, folderColors, folderLegend,
  hasUnfolderedNotes, nodeCount, linkCount, atNodeLimit, nodeLimit,
}: Props) {
  const router = useRouter()
  const [hiddenFolderIds, setHiddenFolderIds] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setHiddenFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const showToggles = folderLegend.length > 0 || hasUnfolderedNotes

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Bar */}
      <div className="px-4 h-11 flex items-center gap-3 border-b border-[#334155] flex-shrink-0 overflow-x-auto">
        <span className="text-sm font-medium text-slate-300 flex-shrink-0">Graph</span>
        <span className="text-xs text-slate-600 flex-shrink-0">
          {nodeCount} notes · {linkCount} links
        </span>
        {atNodeLimit && (
          <span className="text-xs text-orange-500/80 flex-shrink-0">
            Showing first {nodeLimit} notes
          </span>
        )}

        <div className="flex-1" />

        <button
          onClick={() => router.refresh()}
          title="Refresh graph"
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1e293b]/80 border border-[#334155] text-xs text-slate-500 hover:text-orange-400 hover:bg-slate-700/40 transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Graph + floating legend */}
      <div className="flex-1 min-h-0 relative">
        <GraphView
          initialNodes={initialNodes}
          initialLinks={initialLinks}
          workspaceId={workspaceId}
          folderColors={folderColors}
          hiddenFolderIds={hiddenFolderIds}
        />

        {/* Legend sits OUTSIDE the canvas div — siblings can't be intercepted by the canvas */}
        {showToggles && (
          <div className="absolute bottom-4 left-4 z-10 bg-[#1e293b]/90 border border-[#334155] rounded-lg px-3 py-2.5 backdrop-blur-sm max-h-64 overflow-y-auto">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Folders</p>
            <ul className="space-y-1.5">
              {folderLegend.map((item) => {
                const hidden = hiddenFolderIds.has(item.id)
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 cursor-pointer select-none"
                    style={{ paddingLeft: item.depth * 12 }}
                    onClick={() => toggle(item.id)}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity"
                      style={{ backgroundColor: item.color, opacity: hidden ? 0.25 : 1 }}
                    />
                    <span className={`text-xs truncate max-w-[140px] ${hidden ? 'text-slate-600 line-through' : 'text-slate-300'}`}>
                      {item.name}
                    </span>
                  </li>
                )
              })}
              {hasUnfolderedNotes && (() => {
                const hidden = hiddenFolderIds.has('__no-folder__')
                return (
                  <li
                    className="flex items-center gap-2 cursor-pointer select-none"
                    onClick={() => toggle('__no-folder__')}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[#64748b] ${hidden ? 'opacity-25' : ''}`} />
                    <span className={`text-xs italic ${hidden ? 'text-slate-600 line-through' : 'text-slate-500'}`}>No folder</span>
                  </li>
                )
              })()}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
