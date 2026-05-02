import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeText } from '@/lib/utils'
import {
  getAuthUser,
  unauthorized,
  badRequest,
  notFound,
  forbidden,
  apiError,
  serverError,
  parseJsonBody,
} from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response
  const { booking_id, reason } = parsed.data

  if (!booking_id || typeof booking_id !== 'string') {
    return badRequest('booking_id inválido.')
  }
  if (typeof reason !== 'string' || reason.length < 10 || reason.length > 500) {
    return badRequest('O motivo deve ter entre 10 e 500 caracteres.')
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, customer_id, serviceiro_id, status')
    .eq('id', booking_id)
    .single()

  if (!booking) return notFound('Reserva não encontrada.')

  if (booking.customer_id !== user.id) {
    return forbidden('Somente o cliente pode abrir disputa.')
  }

  if (booking.status !== 'active') {
    return apiError('Reserva não está ativa.', 409)
  }

  const admin = createAdminClient()

  const { data: disputeId, error } = await admin.rpc('open_booking_dispute', {
    p_booking_id: booking_id,
    p_opened_by: user.id,
    p_reason: sanitizeText(reason),
  })

  if (error || !disputeId) {
    if (error?.code === '23505') {
      return apiError('Já existe uma disputa para esta reserva.', 409)
    }
    console.error('[disputes] Failed to open dispute:', error)
    return serverError('Erro ao abrir disputa. Tente novamente.')
  }

  return NextResponse.json({ id: disputeId })
}
