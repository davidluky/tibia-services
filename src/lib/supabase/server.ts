// Server-side Supabase client (used in Server Components and API routes)
// Still uses the anon key but runs server-side — respects RLS policies.
import 'server-only'
import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireServerEnv } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    requireServerEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireServerEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components can read cookies but cannot always write them.
            // Auth mutations happen in Client Components or route handlers.
          }
        },
      },
    }
  )
}
