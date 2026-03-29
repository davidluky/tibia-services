import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthUser,
  unauthorized,
  badRequest,
  forbidden,
  notFound,
  serverError,
} from '@/lib/api-helpers'
import { sanitizeText } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const booking_id = searchParams.get('booking_id')

  if (!booking_id) return badRequest('booking_id requerido.')

  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  // Verify user is a participant
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', booking_id)
    .or(`customer_id.eq.${user.id},serviceiro_id.eq.${user.id}`)
    .single()

  if (!booking) return forbidden('Acesso negado.')

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(display_name)')
    .eq('booking_id', booking_id)
    .order('created_at', { ascending: true })

  if (error) return serverError('Erro ao buscar mensagens.')

  return NextResponse.json(messages)
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  const body = await request.json()
  const { booking_id, content } = body

  if (!booking_id || !content?.trim()) return badRequest('Dados inválidos.')

  if (content.length > 1000) return badRequest('Mensagem muito longa.')

  // Verify user is a participant and booking is active
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', booking_id)
    .or(`customer_id.eq.${user.id},serviceiro_id.eq.${user.id}`)
    .single()

  if (!booking) return notFound('Reserva não encontrada.')

  if (booking.status !== 'active') {
    return badRequest('Só é possível enviar mensagens em reservas ativas.')
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      booking_id,
      sender_id: user.id,
      content: sanitizeText(content),
    })
    .select('*, sender:profiles!sender_id(display_name)')
    .single()

  if (error) return serverError('Erro ao enviar mensagem.')

  return NextResponse.json(message, { status: 201 })
}
