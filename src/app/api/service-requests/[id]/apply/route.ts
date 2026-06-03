import { NextRequest, NextResponse } from 'next/server'
import { GAMEPLAY_TYPES } from '@/lib/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getAuthUser,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  apiError,
  serverError,
} from '@/lib/api-helpers'

export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()
  const admin = createAdminClient()

  // Must be a serviceiro
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') {
    return forbidden('Somente serviceiros podem oferecer serviços.')
  }
  if (profile.is_banned) {
    return forbidden('Conta suspensa.')
  }

  // Fetch the service request
  const { data: request } = await supabase
    .from('service_requests')
    .select('id, customer_id, service_type, status')
    .eq('id', params.id)
    .single()

  if (!request) return notFound('Pedido não encontrado.')
  if (request.status !== 'open') {
    return apiError('Este pedido não está mais disponível.', 409)
  }
  if (request.customer_id === user.id) {
    return badRequest('Você não pode oferecer serviço ao seu próprio pedido.')
  }

  const { data: customerProfile } = await admin
    .from('profiles')
    .select('role, is_banned')
    .eq('id', request.customer_id)
    .single()

  if (!customerProfile || customerProfile.role !== 'customer' || customerProfile.is_banned) {
    return apiError('Este pedido não está mais disponível.', 409)
  }

  // Validate service_type
  const validTypes = GAMEPLAY_TYPES.map(g => g.key)
  if (!validTypes.includes(request.service_type)) {
    return badRequest('Tipo de serviço inválido.')
  }

  // Create booking: serviceiro offers → customer is the requester
  const { data: booking, error } = await admin
    .from('bookings')
    .insert({
      customer_id:   request.customer_id,
      serviceiro_id: user.id,
      service_type:  request.service_type,
      status:        'pending',
    })
    .select('id')
    .single()

  if (error) return serverError('Erro ao criar reserva.')

  return NextResponse.json({ booking_id: booking.id }, { status: 201 })
}
