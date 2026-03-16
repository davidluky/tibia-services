import { createClient } from '@/lib/supabase/server'
import { ServiceRequestsClient } from './ServiceRequestsClient'

export default async function ServiceRequestsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: requests }, { data: profile }] = await Promise.all([
    supabase
      .from('service_requests')
      .select('*, customer:profiles!customer_id(display_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false }),
    user
      ? supabase.from('profiles').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const isServiceiro = profile?.role === 'serviceiro'
  const isCustomer = profile?.role === 'customer'

  return (
    <ServiceRequestsClient
      requests={requests ?? []}
      isServiceiro={isServiceiro}
      isCustomer={isCustomer}
      isLoggedIn={!!user}
    />
  )
}
