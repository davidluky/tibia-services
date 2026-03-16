// Admin Supabase client using the service role key.
// NEVER import this in client components — it bypasses all RLS policies.
// Only used in API routes for admin operations (ban user, approve verification, etc.)
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only, never expose to client
  )
}
