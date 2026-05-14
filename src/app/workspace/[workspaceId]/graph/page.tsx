import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GraphView, { type GraphNode, type GraphLink, type FolderLegendItem } from '@/components/graph/GraphView'

export const dynamic = 'force-dynamic'

const NODE_LIMIT = 500

interface FolderRow { id: string; name: string; parent_id: string | null }

function generateFolderColors(folders: FolderRow[]): Record<string, string> {
  if (folders.length === 0) return {}

  const roots = folders.filter((f) => f.parent_id === null)
  const rootHue: Record<string, number> = {}
  roots.forEach((f, i) => {
    rootHue[f.id] = Math.round((i * 360) / roots.length)
  })

  const hueMap: Record<string, number> = { ...rootHue }
  const depthMap: Record<string, number> = Object.fromEntries(roots.map((f) => [f.id, 0]))
  const processed = new Set(roots.map((f) => f.id))
  let remaining = folders.filter((f) => f.parent_id !== null)

  while (remaining.length > 0) {
    const next: FolderRow[] = []
    for (const f of remaining) {
      if (f.parent_id && processed.has(f.parent_id)) {
        hueMap[f.id] = hueMap[f.parent_id]
        depthMap[f.id] = depthMap[f.parent_id] + 1
        processed.add(f.id)
      } else {
        next.push(f)
      }
    }
    if (next.length === remaining.length) break
    remaining = next
  }

  const colors: Record<string, string> = {}
  for (const f of folders) {
    const hue = hueMap[f.id] ?? 0
    const depth = depthMap[f.id] ?? 0
    const saturation = Math.max(40, 70 - depth * 12)
    const lightness = Math.min(78, 58 + depth * 10)
    colors[f.id] = `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }
  return colors
}

// DFS walk so legend shows parent → children in order
function buildLegend(
  folders: FolderRow[],
  colors: Record<string, string>,
  parentId: string | null = null,
  depth = 0,
): FolderLegendItem[] {
  return folders
    .filter((f) => (f.parent_id ?? null) === parentId)
    .flatMap((f) => [
      { id: f.id, name: f.name, color: colors[f.id] ?? '#64748b', depth },
      ...buildLegend(folders, colors, f.id, depth + 1),
    ])
}

export default async function GraphPage({
  params,
}: {
  params: { workspaceId: string }
}) {
  const { workspaceId } = params
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: role } = await supabase.rpc('workspace_role', {
    p_workspace_id: workspaceId,
  })
  if (!role) notFound()

  const [{ data: notesData }, { data: foldersData }] = await Promise.all([
    supabase
      .from('notes')
      .select('id, title, dm_only, folder_id')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(NODE_LIMIT),
    supabase
      .from('folders')
      .select('id, name, parent_id')
      .eq('workspace_id', workspaceId),
  ])

  const rawNotes = notesData ?? []
  const noteIds = rawNotes.map((n) => n.id)
  const folders = foldersData ?? []

  const folderColors = generateFolderColors(folders)
  const folderLegend = buildLegend(folders, folderColors)
  const hasUnfolderedNotes = rawNotes.some((n) => !n.folder_id)

  const { data: linksData } =
    noteIds.length > 0
      ? await supabase
          .from('note_links')
          .select('source_id, target_id')
          .in('source_id', noteIds)
      : { data: [] }

  const connectionCount: Record<string, number> = {}
  for (const link of linksData ?? []) {
    connectionCount[link.source_id] = (connectionCount[link.source_id] ?? 0) + 1
    connectionCount[link.target_id] = (connectionCount[link.target_id] ?? 0) + 1
  }

  const nodes: GraphNode[] = rawNotes.map((n) => ({
    id: n.id,
    name: n.title || 'Untitled',
    dmOnly: n.dm_only,
    folderId: n.folder_id ?? null,
    val: Math.max(1, connectionCount[n.id] ?? 0),
  }))

  const nodeIdSet = new Set(noteIds)
  const links: GraphLink[] = (linksData ?? [])
    .filter((l) => nodeIdSet.has(l.source_id) && nodeIdSet.has(l.target_id))
    .map((l) => ({ source: l.source_id, target: l.target_id }))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 h-11 flex items-center gap-3 border-b border-[#334155] flex-shrink-0">
        <span className="text-sm font-medium text-slate-300">Graph</span>
        <span className="text-xs text-slate-600">
          {nodes.length} notes · {links.length} links
        </span>
        {rawNotes.length === NODE_LIMIT && (
          <span className="text-xs text-orange-500/80">
            Showing first {NODE_LIMIT} notes
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <GraphView
          initialNodes={nodes}
          initialLinks={links}
          workspaceId={workspaceId}
          folderColors={folderColors}
          folderLegend={folderLegend}
          hasUnfolderedNotes={hasUnfolderedNotes}
        />
      </div>
    </div>
  )
}
