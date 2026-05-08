import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: { token: string }
}

// Validates and redeems a workspace invite token, then redirects to the workspace.
// If the user isn't logged in, middleware redirects them to /login?next=/invite/<token>
// and they land here again after auth.
export default async function InvitePage({ params }: Props) {
  const { token } = params
  const supabase = createClient()

  // Validate token is real before attempting redemption (gives a friendly error)
  const { data: invite, error: fetchError } = await supabase
    .from('invites')
    .select('workspace_id, expires_at, used_at')
    .eq('token', token)
    .single()

  if (fetchError || !invite) {
    return <InviteError message="This invite link is invalid or has expired." />
  }

  if (invite.used_at) {
    return <InviteError message="This invite link has already been used." />
  }

  if (new Date(invite.expires_at) < new Date()) {
    return <InviteError message="This invite link has expired." />
  }

  // Redeem via security-definer RPC (handles membership insert + used_at update)
  const { data: workspaceId, error: redeemError } = await supabase
    .rpc('redeem_invite', { p_token: token })

  if (redeemError) {
    return <InviteError message={redeemError.message} />
  }

  redirect(`/workspace/${workspaceId}`)
}

function InviteError({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
      <div className="w-full max-w-md p-8 rounded-xl bg-[#161b27] border border-[#2a3347] text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg
            className="h-6 w-6 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-white">Invite Invalid</h1>
        <p className="text-sm text-gray-400">{message}</p>
        <a href="/" className="inline-block mt-2 text-sm text-indigo-400 hover:underline">
          Go to MindMap
        </a>
      </div>
    </div>
  )
}
