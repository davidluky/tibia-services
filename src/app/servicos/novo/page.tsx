import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewRequestForm } from './NewRequestForm'

export default async function NewServiceRequestPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'customer') redirect('/servicos')

  return <NewRequestForm />
}
