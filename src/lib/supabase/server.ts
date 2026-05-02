// Server-side Supabase client (used in Server Components and API routes)
// Still uses the anon key but runs server-side — respects RLS policies.
import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies, type UnsafeUnwrappedCookies } from 'next/headers';
import { requireServerEnv } from '@/lib/env'

export function createClient() {
  const cookieStore = (cookies() as unknown as UnsafeUnwrappedCookies)
  return createServerClient(
    requireServerEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireServerEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
