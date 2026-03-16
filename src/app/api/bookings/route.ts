import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GAMEPLAY_TYPES } from '@/lib/constants'
import { sendBookingCreated } from '@/lib/email'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body = await request.json()
  const { serviceiro_id, service_type } = body

  if (!serviceiro_id || !service_type) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  // Validate service_type is a known gameplay type
  const validTypes = GAMEPLAY_TYPES.map(g => g.key)
  if (!validTypes.includes(service_type)) {
    return NextResponse.json({ error: 'Tipo de serviço inválido.' }, { status: 400 })
  }

  // Verify the customer is not trying to book themselves
  if (user.id === serviceiro_id) {
    return NextResponse.json({ error: 'Você não pode reservar a si mesmo.' }, { status: 400 })
  }

  // Verify requesting user is a customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Somente clientes podem criar reservas.' }, { status: 403 })
  }

  // Verify serviceiro exists
  const { data: serviceiro } = await supabase
    .from('profiles')
    .select('id, role, is_banned')
    .eq('id', serviceiro_id)
    .eq('role', 'serviceiro')
    .single()

  if (!serviceiro || serviceiro.is_banned) {
    return NextResponse.json({ error: 'Serviceiro não encontrado.' }, { status: 404 })
  }

  // Create the booking
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      customer_id: user.id,
      serviceiro_id,
      service_type,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Erro ao criar reserva.' }, { status: 500 })
  }

  void sendBookingCreated({
    bookingId: booking.id,
    serviceiroId: serviceiro_id,
    customerName: profile.display_name ?? 'Cliente',
    serviceType: service_type,
  })

  return NextResponse.json({ id: booking.id }, { status: 201 })
}
