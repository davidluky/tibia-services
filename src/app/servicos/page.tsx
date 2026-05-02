import { createClient } from '@/lib/supabase/server'
import { ServiceRequestsClient } from './ServiceRequestsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pedidos de Serviço | Tibia Services',
  description: 'Veja pedidos abertos de clientes e encontre oportunidades de serviço no Tibia.',
}

export default async function ServiceRequestsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: requests }, profileResult, serviceiroResult] = await Promise.all([
    supabase
      .from('service_requests')
      .select('*, customer:profiles!customer_id(display_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false }),
    user
      ? supabase.from('profiles').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('serviceiro_profiles').select('gameplay_types').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const profile = profileResult.data
  const serviceiroProfile = serviceiroResult.data
  const isServiceiro = profile?.role === 'serviceiro'
  const isCustomer = profile?.role === 'customer'

  return (
    <ServiceRequestsClient
      requests={requests ?? []}
      isServiceiro={isServiceiro}
      isCustomer={isCustomer}
      isLoggedIn={!!user}
      serviceiroGameplayTypes={isServiceiro && serviceiroProfile ? serviceiroProfile.gameplay_types : []}
    />
  )
}
