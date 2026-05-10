import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GraphView, { type GraphNode, type GraphLink } from '@/components/graph/GraphView'

const NODE_LIMIT = 500

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

  // Verify membership
  const { data: role } = await supabase.rpc('workspace_role', {
    p_workspace_id: workspaceId,
  })
  if (!role) notFound()

  // Fetch notes (nodes) — capped at NODE_LIMIT, exclude soft-deleted
  const { data: notesData } = await supabase
    .from('notes')
    .select('id, title, dm_only')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(NODE_LIMIT)

  const rawNotes = notesData ?? []
  const noteIds = rawNotes.map((n) => n.id)

  // Fetch edges — only between the notes we fetched
  const { data: linksData } =
    noteIds.length > 0
      ? await supabase
          .from('note_links')
          .select('source_id, target_id')
          .in('source_id', noteIds)
      : { data: [] }

  // Compute connection counts for node sizing
  const connectionCount: Record<string, number> = {}
  for (const link of linksData ?? []) {
    connectionCount[link.source_id] = (connectionCount[link.source_id] ?? 0) + 1
    connectionCount[link.target_id] = (connectionCount[link.target_id] ?? 0) + 1
  }

  const nodes: GraphNode[] = rawNotes.map((n) => ({
    id: n.id,
    name: n.title || 'Untitled',
    dmOnly: n.dm_only,
    val: Math.max(1, connectionCount[n.id] ?? 0),
  }))

  // Filter links so both endpoints are in our node set
  const nodeIdSet = new Set(noteIds)
  const links: GraphLink[] = (linksData ?? [])
    .filter((l) => nodeIdSet.has(l.source_id) && nodeIdSet.has(l.target_id))
    .map((l) => ({ source: l.source_id, target: l.target_id }))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 h-11 flex items-center gap-3 border-b border-[#2a3347] flex-shrink-0">
        <span className="text-sm font-medium text-gray-300">Graph</span>
        <span className="text-xs text-gray-600">
          {nodes.length} notes · {links.length} links
        </span>
        {rawNotes.length === NODE_LIMIT && (
          <span className="text-xs text-amber-500/80">
            Showing first {NODE_LIMIT} notes
          </span>
        )}
      </div>

      {/* 3D graph — fills remaining height */}
      <div className="flex-1 min-h-0">
        <GraphView nodes={nodes} links={links} workspaceId={workspaceId} />
      </div>
    </div>
  )
}
