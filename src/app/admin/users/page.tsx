import { createAdminClient } from '@/lib/supabase/admin'
import ApproveToggle from './ApproveToggle'

export default async function AdminUsersPage() {
  const admin = createAdminClient()

  type ProfileRow = {
    id: string
    full_name: string | null
    email: string
    approved: boolean
    created_at: string
  }

  const { data: profilesData } = await admin
    .from('profiles')
    .select('id, full_name, email, approved, created_at')
    .order('created_at', { ascending: false })

  const rows = (profilesData ?? []) as unknown as ProfileRow[]
  rows.sort((a, b) => Number(b.approved) - Number(a.approved) === 0
    ? 0 : Number(a.approved) - Number(b.approved))
  const pending = rows.filter((p) => !p.approved)

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold text-white">Users</h1>
        <span className="text-sm text-slate-500">{rows.length} total</span>
        {pending.length > 0 && (
          <span className="text-sm text-orange-400 font-medium">{pending.length} pending approval</span>
        )}
      </div>

      <Table>
        <thead>
          <Tr header>
            <Th>User</Th>
            <Th>Joined</Th>
            <Th>Status</Th>
            <Th />
          </Tr>
        </thead>
        <tbody className="divide-y divide-[#334155]">
          {rows.map((profile) => (
            <Tr key={profile.id}>
              <Td>
                <div>
                  <div className="text-sm text-slate-100">{profile.full_name ?? <span className="text-slate-600">—</span>}</div>
                  <div className="text-xs text-slate-500">{profile.email}</div>
                </div>
              </Td>
              <Td>
                <span className="text-xs text-slate-400 tabular-nums">
                  {new Date(profile.created_at!).toLocaleDateString()}
                </span>
              </Td>
              <Td>
                {profile.approved ? (
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">Approved</span>
                ) : (
                  <span className="text-xs font-medium text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-md">Pending</span>
                )}
              </Td>
              <Td align="right">
                <ApproveToggle userId={profile.id} approved={profile.approved ?? false} />
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#334155] overflow-hidden">
      <table className="w-full text-left">{children}</table>
    </div>
  )
}

function Tr({ children, header }: { children: React.ReactNode; header?: boolean }) {
  return (
    <tr className={header ? 'bg-[#1e293b]' : 'bg-[#0f172a] hover:bg-[#1e293b] transition-colors'}>
      {children}
    </tr>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{children}</th>
}

function Td({ children, align }: { children?: React.ReactNode; align?: 'right' }) {
  return <td className={`px-4 py-3 ${align === 'right' ? 'text-right' : ''}`}>{children}</td>
}
