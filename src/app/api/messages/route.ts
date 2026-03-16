import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const booking_id = searchParams.get('booking_id')

  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id requerido.' }, { status: 400 })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Verify user is a participant
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', booking_id)
    .or(`customer_id.eq.${user.id},serviceiro_id.eq.${user.id}`)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(display_name)')
    .eq('booking_id', booking_id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar mensagens.' }, { status: 500 })
  }

  return NextResponse.json(messages)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body = await request.json()
  const { booking_id, content } = body

  if (!booking_id || !content?.trim()) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  if (content.length > 1000) {
    return NextResponse.json({ error: 'Mensagem muito longa.' }, { status: 400 })
  }

  // Verify user is a participant and booking is active
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', booking_id)
    .or(`customer_id.eq.${user.id},serviceiro_id.eq.${user.id}`)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
  }

  if (booking.status !== 'active') {
    return NextResponse.json({ error: 'Só é possível enviar mensagens em reservas ativas.' }, { status: 400 })
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      booking_id,
      sender_id: user.id,
      content: content.trim(),
    })
    .select('*, sender:profiles!sender_id(display_name)')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Erro ao enviar mensagem.' }, { status: 500 })
  }

  return NextResponse.json(message, { status: 201 })
}
