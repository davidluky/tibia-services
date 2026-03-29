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
} from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  const body = await request.json()
  const { booking_id, reason } = body

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

  if (booking.customer_id !== user.id && booking.serviceiro_id !== user.id) {
    return forbidden('Acesso negado.')
  }

  if (booking.status !== 'active') {
    return apiError('Reserva não está ativa.', 409)
  }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('disputes')
    .select('id')
    .eq('booking_id', booking_id)
    .maybeSingle()

  if (existing) {
    return apiError('Já existe uma disputa para esta reserva.', 409)
  }

  const { data: dispute, error: insertError } = await admin
    .from('disputes')
    .insert({ booking_id, opened_by: user.id, reason: sanitizeText(reason as string) })
    .select('id')
    .single()

  if (insertError || !dispute) {
    return serverError('Erro ao criar disputa.')
  }

  const { error: updateError } = await admin
    .from('bookings')
    .update({ status: 'disputed' })
    .eq('id', booking_id)

  if (updateError) {
    console.error('[disputes] Failed to update booking status, rolling back dispute:', updateError)
    await admin.from('disputes').delete().eq('id', dispute.id)
    return serverError('Erro ao abrir disputa. Tente novamente.')
  }

  return NextResponse.json({ id: dispute.id })
}
