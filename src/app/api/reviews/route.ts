import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body = await request.json()
  const { booking_id, serviceiro_id, rating, comment } = body

  if (!booking_id || !serviceiro_id || !rating) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Avaliação deve ser de 1 a 5.' }, { status: 400 })
  }

  if (comment && (typeof comment !== 'string' || comment.length > 1000)) {
    return NextResponse.json({ error: 'Comentário inválido ou muito longo.' }, { status: 400 })
  }

  // Verify booking exists, is completed, and this user is the customer
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, customer_id, serviceiro_id')
    .eq('id', booking_id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
  }

  if (booking.status !== 'completed') {
    return NextResponse.json({ error: 'Somente reservas concluídas podem ser avaliadas.' }, { status: 400 })
  }

  if (booking.customer_id !== user.id) {
    return NextResponse.json({ error: 'Somente o cliente pode avaliar.' }, { status: 403 })
  }

  if (booking.serviceiro_id !== serviceiro_id) {
    return NextResponse.json({ error: 'Serviceiro inválido.' }, { status: 400 })
  }

  // Insert review (UNIQUE constraint on booking_id prevents duplicates)
  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      booking_id,
      reviewer_id: user.id,
      serviceiro_id,
      rating,
      comment: comment?.trim() || null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Você já avaliou esta reserva.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar avaliação.' }, { status: 500 })
  }

  return NextResponse.json({ id: review.id }, { status: 201 })
}
