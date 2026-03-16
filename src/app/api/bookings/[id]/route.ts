import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidTC } from '@/lib/utils'
import {
  sendBookingAccepted,
  sendBookingDeclined,
  sendBookingCompleted,
  sendBookingCancelled,
} from '@/lib/email'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:profiles!customer_id(id, display_name, role, bio, is_banned, created_at),
      serviceiro:profiles!serviceiro_id(id, display_name, role, bio, is_banned, created_at)
    `)
    .eq('id', params.id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
  }

  if (booking.customer_id !== user.id && booking.serviceiro_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  return NextResponse.json(booking)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Fetch the booking to verify participant status
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
  }

  const isCustomer = user.id === booking.customer_id
  const isServiceiro = user.id === booking.serviceiro_id

  if (!isCustomer && !isServiceiro) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const body = await request.json()
  const { action, price_tc } = body

  // Fetch display names for both participants (profiles are publicly readable)
  const { data: participantProfiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', [booking.customer_id, booking.serviceiro_id])

  const customerName = participantProfiles?.find(p => p.id === booking.customer_id)?.display_name ?? 'Cliente'
  const serviceiroName = participantProfiles?.find(p => p.id === booking.serviceiro_id)?.display_name ?? 'Serviceiro'

  let update: Record<string, unknown> = {}

  switch (action) {
    case 'accept':
      if (!isServiceiro) return NextResponse.json({ error: 'Somente o serviceiro pode aceitar.' }, { status: 403 })
      if (booking.status !== 'pending') return NextResponse.json({ error: 'Reserva não está pendente.' }, { status: 400 })
      update = { status: 'active' }
      sendBookingAccepted({ bookingId: params.id, customerId: booking.customer_id, serviceiroName, serviceType: booking.service_type })
      break

    case 'decline':
      if (!isServiceiro) return NextResponse.json({ error: 'Somente o serviceiro pode recusar.' }, { status: 403 })
      if (booking.status !== 'pending') return NextResponse.json({ error: 'Reserva não está pendente.' }, { status: 400 })
      update = { status: 'declined' }
      sendBookingDeclined({ bookingId: params.id, customerId: booking.customer_id, serviceiroName, serviceType: booking.service_type })
      break

    case 'cancel': {
      if (booking.status !== 'active' && booking.status !== 'pending') {
        return NextResponse.json({ error: 'Não é possível cancelar esta reserva.' }, { status: 400 })
      }
      update = { status: 'cancelled' }
      const recipientId = isCustomer ? booking.serviceiro_id : booking.customer_id
      const cancellerName = isCustomer ? customerName : serviceiroName
      sendBookingCancelled({ bookingId: params.id, recipientId, cancellerName, serviceType: booking.service_type })
      break
    }

    case 'set_price':
      if (!price_tc || !isValidTC(price_tc)) {
        return NextResponse.json({ error: 'Preço inválido. Deve ser múltiplo de 25 TC.' }, { status: 400 })
      }
      if (booking.status !== 'active') return NextResponse.json({ error: 'Reserva não está ativa.' }, { status: 400 })
      update = {
        agreed_price_tc: price_tc,
        price_confirmed_by_customer: isCustomer,
        price_confirmed_by_serviceiro: isServiceiro,
      }
      break

    case 'confirm_price':
      if (booking.status !== 'active') return NextResponse.json({ error: 'Reserva não está ativa.' }, { status: 400 })
      if (!booking.agreed_price_tc) return NextResponse.json({ error: 'Preço ainda não definido.' }, { status: 400 })
      if (isCustomer) update = { price_confirmed_by_customer: true }
      else update = { price_confirmed_by_serviceiro: true }
      break

    case 'payment_sent':
      if (!isCustomer) return NextResponse.json({ error: 'Somente o cliente pode confirmar pagamento.' }, { status: 403 })
      update = { payment_sent_by_customer: true }
      break

    case 'payment_received':
      if (!isServiceiro) return NextResponse.json({ error: 'Somente o serviceiro pode confirmar recebimento.' }, { status: 403 })
      update = { payment_received_by_serviceiro: true }
      break

    case 'mark_complete': {
      if (booking.status !== 'active') return NextResponse.json({ error: 'Reserva não está ativa.' }, { status: 400 })
      if (isCustomer) update = { complete_by_customer: true }
      else update = { complete_by_serviceiro: true }

      const willBothComplete =
        (isCustomer && booking.complete_by_serviceiro) ||
        (isServiceiro && booking.complete_by_customer)

      if (willBothComplete) {
        update.status = 'completed'
        update.completed_at = new Date().toISOString()
        sendBookingCompleted({ bookingId: params.id, customerId: booking.customer_id, serviceiroName })
      }
      break
    }

    default:
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('bookings')
    .update(update)
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar reserva.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
