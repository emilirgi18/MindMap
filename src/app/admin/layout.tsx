import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from './AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const adminId = process.env.ADMIN_USER_ID
  if (!user || !adminId || user.id !== adminId) redirect('/')

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-100">
      {/* Top bar */}
      <header className="border-b border-[#2a3347] bg-[#161b27]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
          <span className="text-sm font-semibold text-white tracking-tight">
            MindMap <span className="text-gray-600 font-normal">/ admin</span>
          </span>
          <AdminNav />
          <a
            href="/"
            className="ml-auto text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            ← Back to app
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
