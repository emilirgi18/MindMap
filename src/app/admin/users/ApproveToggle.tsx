'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setUserApproved } from '@/lib/actions/admin'

interface Props { userId: string; approved: boolean }

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
          ? 'bg-[#293548] text-slate-400 hover:text-red-400 hover:bg-red-400/10'
          : 'bg-orange-500 text-white hover:bg-orange-400 font-semibold'
      }`}
    >
      {pending ? '…' : approved ? 'Revoke' : 'Approve'}
    </button>
  )
}
