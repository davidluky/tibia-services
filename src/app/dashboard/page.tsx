import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | Tibia Services',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, display_name, bio, is_banned, created_at')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/')
  }

  // Contact fields are column-locked via migration 007. Read through the
  // SECURITY DEFINER helper: it returns only the caller's own row.
  const { data: contact } = await supabase.rpc('my_contact_info').single<{
    whatsapp: string | null
    discord: string | null
  }>()
  const profileWithContact = {
    ...profile,
    whatsapp: contact?.whatsapp ?? null,
    discord: contact?.discord ?? null,
  }

  const { data: sp } = await supabase
    .from('serviceiro_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <DashboardClient
      profile={profileWithContact}
      serviceiroProfile={sp}
      userId={user.id}
    />
  )
}
