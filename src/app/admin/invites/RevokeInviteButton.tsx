'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adminRevokeInvite } from '@/lib/actions/admin'

export default function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleRevoke() {
    startTransition(async () => {
      await adminRevokeInvite(inviteId)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleRevoke}
      disabled={pending}
      className="text-xs font-medium px-3 py-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
    >
      {pending ? '…' : 'Revoke'}
    </button>
  )
}
