'use client'

import { useEffect, useState } from 'react'
import type { SupabaseProvider } from '@/lib/yjs/SupabaseProvider'

interface AwarenessUser {
  name: string
  color: string
}

interface AwarenessState {
  user?: AwarenessUser
}

interface Props {
  provider: SupabaseProvider | null
}

export default function PresenceBar({ provider }: Props) {
  const [users, setUsers] = useState<AwarenessUser[]>([])

  useEffect(() => {
    if (!provider) {
      setUsers([])
      return
    }

    function sync() {
      const localId = provider!.awareness.clientID
      const states = Array.from(provider!.awareness.getStates().entries()) as [
        number,
        AwarenessState,
      ][]
      setUsers(
        states
          .filter(([clientId, s]) => clientId !== localId && s.user != null)
          .map(([, s]) => s.user!)
      )
    }

    provider.awareness.on('change', sync)
    sync()

    return () => {
      provider.awareness.off('change', sync)
    }
  }, [provider])

  // Only show when someone else is in the note
  if (users.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 px-3" title="Viewing this note">
      {users.map((user, i) => (
        <div
          key={i}
          title={user.name}
          className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white ring-2 ring-[#0f172a] select-none"
          style={{ backgroundColor: user.color }}
        >
          {user.name?.[0]?.toUpperCase() ?? '?'}
        </div>
      ))}
    </div>
  )
}
