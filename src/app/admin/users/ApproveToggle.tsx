'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setUserApproved } from '@/lib/actions/admin'

interface Props {
  userId: string
  approved: boolean
}

export default function ApproveToggle({ userId, approved }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      await setUserApproved(userId, !approved)
      router.refresh()
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 ${
        approved
          ? 'bg-[#1c2333] text-gray-400 hover:text-red-400 hover:bg-red-400/10'
          : 'bg-indigo-600 text-white hover:bg-indigo-500'
      }`}
    >
      {pending ? '…' : approved ? 'Revoke' : 'Approve'}
    </button>
  )
}
