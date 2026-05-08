'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createCampaignWorkspace } from '@/lib/actions/workspaces'

export default function NewWorkspaceModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    // Close on Escape
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setError(null)
    startTransition(async () => {
      try {
        await createCampaignWorkspace(trimmed)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create workspace')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-sm mx-4 p-6 rounded-xl bg-[#161b27] border border-[#2a3347] shadow-2xl">
        <h2 className="text-sm font-semibold text-white mb-4">New Campaign</h2>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name"
            maxLength={80}
            className="w-full px-3 py-2 rounded-lg bg-[#0f1117] border border-[#2a3347] text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1c2333] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
