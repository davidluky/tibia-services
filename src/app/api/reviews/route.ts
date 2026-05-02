import { NextRequest, NextResponse } from 'next/server'
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
  const { booking_id, serviceiro_id, rating, comment } = parsed.data

  if (typeof booking_id !== 'string' || typeof serviceiro_id !== 'string' || typeof rating !== 'number') {
    return badRequest('Dados inválidos.')
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return badRequest('Avaliação deve ser de 1 a 5.')
  }

  if (comment && (typeof comment !== 'string' || comment.length > 1000)) {
    return badRequest('Comentário inválido ou muito longo.')
  }

  // Verify booking exists, is completed, and this user is the customer
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, customer_id, serviceiro_id')
    .eq('id', booking_id)
    .single()

  if (!booking) return notFound('Reserva não encontrada.')

  if (booking.status !== 'completed') {
    return badRequest('Somente reservas concluídas podem ser avaliadas.')
  }

  if (booking.customer_id !== user.id) {
    return forbidden('Somente o cliente pode avaliar.')
  }

  if (booking.serviceiro_id !== serviceiro_id) {
    return badRequest('Serviceiro inválido.')
  }

  // Insert review (UNIQUE constraint on booking_id prevents duplicates)
  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      booking_id,
      reviewer_id: user.id,
      serviceiro_id,
      rating,
      comment: comment ? sanitizeText(comment as string) : null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return apiError('Você já avaliou esta reserva.', 409)
    }
    return serverError('Erro ao criar avaliação.')
  }

  return NextResponse.json({ id: review.id }, { status: 201 })
}
