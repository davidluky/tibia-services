import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin,
  unauthorized,
  badRequest,
  notFound,
  apiError,
  serverError,
} from '@/lib/api-helpers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (!auth.authorized) return unauthorized()

  const body = await request.json()
  const { resolution } = body

  if (typeof resolution !== 'string' || resolution.length < 10 || resolution.length > 500) {
    return badRequest('A resolução deve ter entre 10 e 500 caracteres.')
  }

  const { data: dispute } = await auth.adminClient
    .from('disputes')
    .select('id, booking_id, status')
    .eq('id', params.id)
    .single()

  if (!dispute) return notFound('Disputa não encontrada.')

  if (dispute.status !== 'open') {
    return apiError('Disputa já foi resolvida.', 409)
  }

  const { error: disputeUpdateError } = await auth.adminClient.from('disputes').update({
    status: 'resolved',
    resolution,
    resolved_by: auth.user.id,
    resolved_at: new Date().toISOString(),
  }).eq('id', params.id)

  if (disputeUpdateError) {
    console.error('[disputes] Failed to resolve dispute:', disputeUpdateError)
    return serverError('Erro ao resolver disputa.')
  }

  const { error: bookingError } = await auth.adminClient
    .from('bookings')
    .update({ status: 'resolved' })
    .eq('id', dispute.booking_id)

  if (bookingError) {
    console.error('[disputes] Failed to update booking status to resolved:', bookingError)
  }

  return NextResponse.json({ success: true })
}
