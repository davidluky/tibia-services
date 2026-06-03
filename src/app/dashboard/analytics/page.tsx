import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsClient } from './AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') redirect('/dashboard')

  return <AnalyticsClient />
}
