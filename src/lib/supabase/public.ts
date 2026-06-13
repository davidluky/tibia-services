// Cookie-free server client for public, cacheable reads.
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { requireServerEnv } from '@/lib/env'

export function createPublicServerClient() {
  return createClient(
    requireServerEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireServerEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}
