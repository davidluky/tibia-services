import { NextRequest, NextResponse } from 'next/server'
import { isValidTC } from '@/lib/utils'
import {
  sendBookingAccepted,
  sendBookingDeclined,
  sendBookingCompleted,
  sendBookingCancelled,
} from '@/lib/email'
import {
  getAuthUser,
  unauthorized,
  notFound,
  forbidden,
  badRequest,
  serverError,
  parseJsonBody,
} from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

async function notify(userId: string, type: string, title: string, body: string | null, link: string) {
  const admin = createAdminClient()
  await admin.from('notifications').insert({ user_id: userId, type, title, body, link })
}

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:profiles!customer_id(id, display_name, role, bio, is_banned, created_at),
      serviceiro:profiles!serviceiro_id(id, display_name, role, bio, is_banned, created_at)
    `)
    .eq('id', params.id)
    .single()

  if (!booking) return notFound('Reserva não encontrada.')

  if (booking.customer_id !== user.id && booking.serviceiro_id !== user.id) {
    return forbidden('Acesso negado.')
  }

  return NextResponse.json(booking)
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  // Fetch the booking to verify participant status
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!booking) return notFound('Reserva não encontrada.')

  const isCustomer = user.id === booking.customer_id
  const isServiceiro = user.id === booking.serviceiro_id

  if (!isCustomer && !isServiceiro) return forbidden('Acesso negado.')

  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response
  const { action, price_tc } = parsed.data

  if (typeof action !== 'string') {
    return badRequest('Ação inválida.')
  }

  // Fetch display names for both participants (profiles are publicly readable)
  const { data: participantProfiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', [booking.customer_id, booking.serviceiro_id])

  const customerName = participantProfiles?.find(p => p.id === booking.customer_id)?.display_name ?? 'Cliente'
  const serviceiroName = participantProfiles?.find(p => p.id === booking.serviceiro_id)?.display_name ?? 'Serviceiro'

  let update: Record<string, unknown> = {}
  let pendingEmail: (() => void) | null = null
  const pendingNotifications: (() => Promise<void>)[] = []
  const bookingLink = `/bookings/${params.id}`

  switch (action) {
    case 'accept':
      if (!isServiceiro) return forbidden('Somente o serviceiro pode aceitar.')
      if (booking.status !== 'pending') return badRequest('Reserva não está pendente.')
      update = { status: 'active' }
      pendingEmail = () => sendBookingAccepted({ bookingId: params.id, customerId: booking.customer_id, serviceiroName, serviceType: booking.service_type })
      pendingNotifications.push(() => notify(booking.customer_id, 'booking_accepted', 'Reserva aceita', 'O serviceiro aceitou sua reserva.', bookingLink))
      break

    case 'decline':
      if (!isServiceiro) return forbidden('Somente o serviceiro pode recusar.')
      if (booking.status !== 'pending') return badRequest('Reserva não está pendente.')
      update = { status: 'declined' }
      pendingEmail = () => sendBookingDeclined({ bookingId: params.id, customerId: booking.customer_id, serviceiroName, serviceType: booking.service_type })
      pendingNotifications.push(() => notify(booking.customer_id, 'booking_declined', 'Reserva recusada', 'O serviceiro recusou sua reserva.', bookingLink))
      break

    case 'cancel': {
      if (booking.status !== 'active' && booking.status !== 'pending') {
        return badRequest('Não é possível cancelar esta reserva.')
      }
      update = { status: 'cancelled' }
      const recipientId = isCustomer ? booking.serviceiro_id : booking.customer_id
      const cancellerName = isCustomer ? customerName : serviceiroName
      pendingEmail = () => sendBookingCancelled({ bookingId: params.id, recipientId, cancellerName, serviceType: booking.service_type })
      pendingNotifications.push(() => notify(recipientId, 'booking_cancelled', 'Reserva cancelada', `${cancellerName} cancelou a reserva.`, bookingLink))
      break
    }

    case 'set_price':
      if (typeof price_tc !== 'number' || !isValidTC(price_tc)) {
        return badRequest('Preço inválido. Deve ser múltiplo de 25 TC.')
      }
      if (booking.status !== 'active') return badRequest('Reserva não está ativa.')
      update = {
        agreed_price_tc: price_tc,
        price_confirmed_by_customer: isCustomer,
        price_confirmed_by_serviceiro: isServiceiro,
      }
      break

    case 'confirm_price':
      if (booking.status !== 'active') return badRequest('Reserva não está ativa.')
      if (!booking.agreed_price_tc) return badRequest('Preço ainda não definido.')
      if (isCustomer) update = { price_confirmed_by_customer: true }
      else update = { price_confirmed_by_serviceiro: true }
      break

    case 'payment_sent':
      if (!isCustomer) return forbidden('Somente o cliente pode confirmar pagamento.')
      if (booking.status !== 'active') return badRequest('Booking must be active')
      update = { payment_sent_by_customer: true }
      break

    case 'payment_received':
      if (!isServiceiro) return forbidden('Somente o serviceiro pode confirmar recebimento.')
      if (booking.status !== 'active') return badRequest('Booking must be active')
      update = { payment_received_by_serviceiro: true }
      break

    case 'mark_complete': {
      if (booking.status !== 'active') return badRequest('Reserva não está ativa.')
      if (isCustomer) update = { complete_by_customer: true }
      else update = { complete_by_serviceiro: true }

      const willBothComplete =
        (isCustomer && booking.complete_by_serviceiro) ||
        (isServiceiro && booking.complete_by_customer)

      if (willBothComplete) {
        update.status = 'completed'
        update.completed_at = new Date().toISOString()
        pendingEmail = () => sendBookingCompleted({ bookingId: params.id, customerId: booking.customer_id, serviceiroName })
        pendingNotifications.push(
          () => notify(booking.customer_id, 'booking_completed', 'Reserva concluída', 'A reserva foi marcada como concluída.', bookingLink),
          () => notify(booking.serviceiro_id, 'booking_completed', 'Reserva concluída', 'A reserva foi marcada como concluída.', bookingLink),
        )
      }
      break
    }

    default:
      return badRequest('Ação inválida.')
  }

  const { error } = await supabase
    .from('bookings')
    .update(update)
    .eq('id', params.id)

  if (error) return serverError('Erro ao atualizar reserva.')

  pendingEmail?.()
  await Promise.all(pendingNotifications.map(fn => fn()))

  return NextResponse.json({ success: true })
}
