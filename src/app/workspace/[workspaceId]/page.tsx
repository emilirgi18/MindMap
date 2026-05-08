import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Redirect to the most-recently-updated note, or show an empty state.
// The sidebar layout already verifies workspace membership.
export default async function WorkspacePage({
  params,
}: {
  params: { workspaceId: string }
}) {
  const { workspaceId } = params
  const supabase = createClient()

  const { data: note } = await supabase
    .from('notes')
    .select('id')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (note) redirect(`/workspace/${workspaceId}/note/${note.id}`)

  return (
    <div className="flex-1 flex items-center justify-center text-center p-8">
      <div className="space-y-2">
        <p className="text-gray-500 text-sm">No notes yet.</p>
        <p className="text-xs text-gray-600">
          Press <kbd className="px-1.5 py-0.5 rounded bg-[#1c2333] text-gray-400 font-mono text-xs">+</kbd> in the sidebar to create your first note.
        </p>
      </div>
    </div>
  )
}
