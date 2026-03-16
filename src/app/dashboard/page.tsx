import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/')
  }

  const { data: sp } = await supabase
    .from('serviceiro_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <DashboardClient
      profile={profile}
      serviceiroProfile={sp}
      userId={user.id}
    />
  )
}
