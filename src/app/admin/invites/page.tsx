import { createAdminClient } from '@/lib/supabase/admin'
import RevokeInviteButton from './RevokeInviteButton'

export default async function AdminInvitesPage() {
  const admin = createAdminClient()

  const { data: invites } = await admin
    .from('invites')
    .select(`
      id, token, expires_at, used_at, created_at,
      workspaces!workspace_id(name),
      profiles!created_by(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  type InvRow = {
    id: string
    token: string
    expires_at: string
    used_at: string | null
    created_at: string
    workspaces: { name: string } | null
    profiles: { full_name: string | null; email: string } | null
  }
  const rows = ((invites ?? []) as unknown as InvRow[])

  const pending = rows.filter((r) => !r.used_at && new Date(r.expires_at) > new Date())
  const used = rows.filter((r) => r.used_at)
  const expired = rows.filter((r) => !r.used_at && new Date(r.expires_at) <= new Date())

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold text-white">Invites</h1>
        <span className="text-sm text-gray-600">{rows.length} total</span>
        {pending.length > 0 && (
          <span className="text-sm text-indigo-400">{pending.length} active</span>
        )}
      </div>

      <div className="rounded-xl border border-[#2a3347] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#161b27]">
              {['Workspace', 'Created by', 'Expires', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a3347]">
            {rows.map((inv) => {
              const isExpired = new Date(inv.expires_at) <= new Date()
              const status = inv.used_at ? 'used' : isExpired ? 'expired' : 'active'

              return (
                <tr key={inv.id} className="bg-[#0f1117] hover:bg-[#161b27] transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {inv.workspaces?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-400">{inv.profiles?.full_name ?? '—'}</div>
                    <div className="text-xs text-gray-600">{inv.profiles?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 tabular-nums">
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {status === 'active' && (
                      <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded-md">
                        Active
                      </span>
                    )}
                    {status === 'used' && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded-md">
                        Used
                      </span>
                    )}
                    {status === 'expired' && (
                      <span className="text-xs font-medium text-red-400/70 bg-red-400/10 px-2 py-0.5 rounded-md">
                        Expired
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {status === 'active' && (
                      <RevokeInviteButton inviteId={inv.id} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
