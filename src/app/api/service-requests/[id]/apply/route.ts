import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GAMEPLAY_TYPES } from '@/lib/constants'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Must be a serviceiro
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') {
    return NextResponse.json({ error: 'Somente serviceiros podem oferecer serviços.' }, { status: 403 })
  }
  if (profile.is_banned) {
    return NextResponse.json({ error: 'Conta suspensa.' }, { status: 403 })
  }

  // Fetch the service request
  const { data: request } = await supabase
    .from('service_requests')
    .select('id, customer_id, service_type, status')
    .eq('id', params.id)
    .single()

  if (!request) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
  }
  if (request.status !== 'open') {
    return NextResponse.json({ error: 'Este pedido não está mais disponível.' }, { status: 409 })
  }
  if (request.customer_id === user.id) {
    return NextResponse.json({ error: 'Você não pode oferecer serviço ao seu próprio pedido.' }, { status: 400 })
  }

  // Validate service_type
  const validTypes = GAMEPLAY_TYPES.map(g => g.key)
  if (!validTypes.includes(request.service_type)) {
    return NextResponse.json({ error: 'Tipo de serviço inválido.' }, { status: 400 })
  }

  // Create booking: serviceiro offers → customer is the requester
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      customer_id:   request.customer_id,
      serviceiro_id: user.id,
      service_type:  request.service_type,
      status:        'pending',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Erro ao criar reserva.' }, { status: 500 })
  }

  return NextResponse.json({ booking_id: booking.id }, { status: 201 })
}
