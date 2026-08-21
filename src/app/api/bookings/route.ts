import { NextRequest, NextResponse } from 'next/server'
import { GAMEPLAY_TYPES } from '@/lib/constants'
import { sendBookingCreated } from '@/lib/email'
import {
  getAuthUser,
  unauthorized,
  badRequest,
  forbidden,
  notFound,
  apiError,
  tooManyRequests,
  serverError,
  checkActionRateLimit,
  parseJsonBody,
} from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response
  const { serviceiro_id, service_type } = parsed.data

  if (typeof serviceiro_id !== 'string' || typeof service_type !== 'string') {
    return badRequest('Dados inválidos.')
  }

  // Validate service_type is a known gameplay type
  if (!GAMEPLAY_TYPES.some(g => g.key === service_type)) {
    return badRequest('Tipo de serviço inválido.')
  }

  // Verify the customer is not trying to book themselves
  if (user.id === serviceiro_id) {
    return badRequest('Você não pode reservar a si mesmo.')
  }

  // Verify requesting user is a customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'customer') {
    return forbidden('Somente clientes podem criar reservas.')
  }

  // Verify serviceiro exists
  const { data: serviceiro } = await supabase
    .from('profiles')
    .select('id, role, is_banned')
    .eq('id', serviceiro_id)
    .eq('role', 'serviceiro')
    .single()

  if (!serviceiro || serviceiro.is_banned) {
    return notFound('Serviceiro não encontrado.')
  }

  // One outstanding request per pair and service type. The per-user rate limit
  // below only slows a loop down; without this cap a customer can keep POSTing
  // against one serviceiro and turn their inbox — and the shared Resend quota
  // every other transactional email depends on — into a firehose.
  const { data: alreadyPending } = await supabase
    .from('bookings')
    .select('id')
    .eq('customer_id', user.id)
    .eq('serviceiro_id', serviceiro_id)
    .eq('service_type', service_type)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()

  if (alreadyPending) {
    return apiError('Você já tem uma solicitação pendente deste serviço com este serviceiro.', 409)
  }

  // Rate limit: max 3 booking requests per minute per user
  const rateLimited = await checkActionRateLimit(user.id, 'create_booking', 60_000, 3)
  if (rateLimited) {
    return tooManyRequests('Muitas solicitações. Aguarde um momento antes de tentar novamente.')
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
    return serverError('Erro ao criar reserva.')
  }

  // Recipient-side cap. The pair check and the per-user limit above both free up
  // as soon as a request is cancelled or declined, so a create/cancel loop can
  // still walk the shared Resend quota. Bound how often one serviceiro can be
  // emailed about new bookings; the booking itself is unaffected either way.
  const mailboxSaturated = await checkActionRateLimit(
    serviceiro_id,
    'booking_created_email',
    60 * 60_000,
    10,
  )

  if (!mailboxSaturated) {
    await sendBookingCreated({
      bookingId: booking.id,
      serviceiroId: serviceiro_id,
      customerName: profile.display_name ?? 'Cliente',
      serviceType: service_type,
    })
  }

  return NextResponse.json({ id: booking.id }, { status: 201 })
}
