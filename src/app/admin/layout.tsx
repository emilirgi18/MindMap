import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from './AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminId = process.env.ADMIN_USER_ID
  if (!user || !adminId || user.id !== adminId) redirect('/')

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <header className="border-b border-[#334155] bg-[#1e293b]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
          <span className="text-sm font-bold text-white tracking-tight">
            MindMap <span className="text-slate-500 font-normal">/ admin</span>
          </span>
          <AdminNav />
          <a href="/" className="ml-auto text-sm text-slate-500 hover:text-orange-400 transition-colors">
            ← Back to app
          </a>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
