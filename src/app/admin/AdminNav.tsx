'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/workspaces', label: 'Workspaces' },
  { href: '/admin/invites', label: 'Invites' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              active
                ? 'bg-indigo-600/20 text-indigo-400 font-medium'
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#1c2333]'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
