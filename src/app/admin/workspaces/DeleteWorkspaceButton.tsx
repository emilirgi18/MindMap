'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteWorkspace } from '@/lib/actions/admin'

export default function DeleteWorkspaceButton({
  workspaceId,
  name,
}: {
  workspaceId: string
  name: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Delete workspace "${name}"? This will delete all notes and cannot be undone.`))
      return
    startTransition(async () => {
      await deleteWorkspace(workspaceId)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="text-xs font-medium px-3 py-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
    >
      {pending ? '…' : 'Delete'}
    </button>
  )
}
