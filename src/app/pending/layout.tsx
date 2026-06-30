import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'

function MindMapLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="20" cy="20" r="5.5" fill="#f97316" />
      <circle cx="7"  cy="8"  r="3" fill="#f97316" opacity="0.5" />
      <circle cx="33" cy="8"  r="3" fill="#f97316" opacity="0.5" />
      <circle cx="7"  cy="32" r="3" fill="#f97316" opacity="0.5" />
      <circle cx="33" cy="32" r="3" fill="#f97316" opacity="0.5" />
      <line x1="15.1" y1="16.4" x2="9.5"  y2="10.3" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <line x1="24.9" y1="16.4" x2="30.5" y2="10.3" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <line x1="15.1" y1="23.6" x2="9.5"  y2="29.7" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <line x1="24.9" y1="23.6" x2="30.5" y2="29.7" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

export default async function PendingLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name, email').eq('id', user.id).single()
    : { data: null }

  const displayName = profile?.full_name ?? profile?.email ?? user?.email ?? ''
  const avatarChar = displayName[0]?.toUpperCase() ?? '?'

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0f1117]">
      {/* Header */}
      <header className="h-12 flex items-center gap-3 px-4 border-b border-[#334155] bg-[#1e293b] flex-shrink-0">
        <div className="flex items-center gap-2 select-none flex-shrink-0">
          <MindMapLogo />
          <span className="text-base font-bold text-white tracking-tight">MindMap</span>
        </div>

        <div className="w-px h-5 bg-[#334155] flex-shrink-0" />

        {/* Greyed-out workspace placeholder */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm font-medium text-slate-600 cursor-not-allowed select-none">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          <span>Workspace</span>
        </div>

        <div className="flex-1" />

        {/* User info + sign out */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="h-7 w-7 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-sm font-semibold text-orange-400 select-none">
            {avatarChar}
          </div>
          <span className="text-sm text-slate-400 max-w-[120px] truncate hidden sm:block">
            {displayName}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              title="Sign out"
              className="p-1.5 rounded-md text-slate-600 hover:text-orange-400 hover:bg-slate-700/40 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z" clipRule="evenodd" />
              </svg>
            </button>
          </form>
        </div>
      </header>

      <div className="flex-1 min-w-0 flex overflow-hidden">
        {/* Sidebar shell — locked/empty for unapproved users */}
        <aside className="flex flex-col w-72 flex-shrink-0 bg-[#1e293b] border-r border-[#334155] overflow-hidden">
          <div className="flex items-center justify-between px-3 h-10 border-b border-[#334155] flex-shrink-0">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Notes</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs text-slate-700">No access</span>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
