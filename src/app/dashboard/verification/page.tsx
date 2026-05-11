import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VerificationClient } from './VerificationClient'

export default async function VerificationPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') {
    redirect('/')
  }

  // Check existing request
  const { data: existing } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('serviceiro_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single()

  return <VerificationClient userId={user.id} existing={existing ?? null} />
}
