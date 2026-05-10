import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NoteView from '@/components/editor/NoteView'

export default async function NotePage({
  params,
}: {
  params: { workspaceId: string; noteId: string }
}) {
  const { workspaceId, noteId } = params
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const [{ data: note }, { data: role }, { data: profile }] = await Promise.all([
    supabase
      .from('notes')
      .select('id, title, body, yjs_state, workspace_id, dm_only')
      .eq('id', noteId)
      .is('deleted_at', null)
      .single(),
    supabase.rpc('workspace_role', { p_workspace_id: workspaceId }),
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .single(),
  ])

  if (!note) notFound()

  return (
    <NoteView
      note={note}
      role={(role as string | null) ?? 'player'}
      profile={profile ?? { id: user.id, full_name: null, email: user.email ?? '' }}
    />
  )
}
