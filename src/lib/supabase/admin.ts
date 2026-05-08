import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// SERVICE ROLE CLIENT — bypasses RLS.
// Import this ONLY in Server Actions and Route Handlers.
// Never import it in any client component or expose the key to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
