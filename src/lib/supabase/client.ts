import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

// Singleton — safe to call multiple times in a client component tree
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
