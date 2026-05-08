import { createAdminClient } from '@/lib/supabase/admin'
import DeleteWorkspaceButton from './DeleteWorkspaceButton'

export default async function AdminWorkspacesPage() {
  const admin = createAdminClient()

  // Fetch campaign workspaces with owner profile + counts
  const { data: workspaces } = await admin
    .from('workspaces')
    .select(`
      id, name, type, created_at,
      profiles!owner_id(full_name, email)
    `)
    .eq('type', 'campaign')
    .order('created_at', { ascending: false })

  // Fetch member + note counts in parallel
  const wsIds = ((workspaces ?? []) as unknown as WsRow[]).map((w) => w.id)

  const [{ data: memberCounts }, { data: noteCounts }] = await Promise.all([
    admin
      .from('workspace_members')
      .select('workspace_id')
      .in('workspace_id', wsIds),
    admin
      .from('notes')
      .select('workspace_id')
      .in('workspace_id', wsIds),
  ])

  const memberMap: Record<string, number> = {}
  for (const row of (memberCounts ?? []) as { workspace_id: string }[]) {
    memberMap[row.workspace_id] = (memberMap[row.workspace_id] ?? 0) + 1
  }
  const noteMap: Record<string, number> = {}
  for (const row of (noteCounts ?? []) as { workspace_id: string }[]) {
    noteMap[row.workspace_id] = (noteMap[row.workspace_id] ?? 0) + 1
  }

  type WsRow = {
    id: string
    name: string
    type: string
    created_at: string
    profiles: { full_name: string | null; email: string } | null
  }
  const rows = ((workspaces ?? []) as unknown as WsRow[])

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold text-white">Workspaces</h1>
        <span className="text-sm text-gray-600">{rows.length} campaign{rows.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="rounded-xl border border-[#2a3347] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#161b27]">
              {['Name', 'Owner', 'Members', 'Notes', 'Created', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a3347]">
            {rows.map((ws) => (
              <tr key={ws.id} className="bg-[#0f1117] hover:bg-[#161b27] transition-colors">
                <td className="px-4 py-3 text-sm text-gray-200">{ws.name}</td>
                <td className="px-4 py-3">
                  <div className="text-xs text-gray-400">{ws.profiles?.full_name ?? '—'}</div>
                  <div className="text-xs text-gray-600">{ws.profiles?.email}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 tabular-nums">
                  {memberMap[ws.id] ?? 0}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 tabular-nums">
                  {noteMap[ws.id] ?? 0}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 tabular-nums">
                  {new Date(ws.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteWorkspaceButton workspaceId={ws.id} name={ws.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
