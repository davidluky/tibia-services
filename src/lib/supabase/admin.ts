// Admin Supabase client using the service role key.
// NEVER import this in client components — it bypasses all RLS policies.
// Only used in API routes for admin operations (ban user, approve verification, etc.)
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { requireServerEnv } from '@/lib/env'

export function createAdminClient() {
  return createClient(
    requireServerEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireServerEnv('SUPABASE_SERVICE_ROLE_KEY'), // server-only, never expose to client
  )
}
