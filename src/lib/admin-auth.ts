import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Authorize every admin data access at the page that performs it.
 *
 * The admin layout keeps the navigation guard for user experience, but layouts
 * are not a security boundary because App Router layouts can be reused across
 * client navigation. Sensitive service-role reads must call this helper before
 * creating or using an admin client.
 */
export async function requireAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || profile.is_banned) {
    redirect('/')
  }

  return { user, adminClient: createAdminClient() }
}
