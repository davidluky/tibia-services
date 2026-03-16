import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await request.json()
  const { booking_id, reason } = body

  if (!booking_id || typeof booking_id !== 'string') {
    return NextResponse.json({ error: 'booking_id inválido.' }, { status: 400 })
  }
  if (typeof reason !== 'string' || reason.length < 10 || reason.length > 500) {
    return NextResponse.json({ error: 'O motivo deve ter entre 10 e 500 caracteres.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select('id, customer_id, serviceiro_id, status')
    .eq('id', booking_id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })

  if (booking.customer_id !== user.id && booking.serviceiro_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  if (booking.status !== 'active') {
    return NextResponse.json({ error: 'Reserva não está ativa.' }, { status: 409 })
  }

  const { data: existing } = await admin
    .from('disputes')
    .select('id')
    .eq('booking_id', booking_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Já existe uma disputa para esta reserva.' }, { status: 409 })
  }

  const { data: dispute, error: insertError } = await admin
    .from('disputes')
    .insert({ booking_id, opened_by: user.id, reason })
    .select('id')
    .single()

  if (insertError || !dispute) {
    return NextResponse.json({ error: 'Erro ao criar disputa.' }, { status: 500 })
  }

  const { error: updateError } = await admin
    .from('bookings')
    .update({ status: 'disputed' })
    .eq('id', booking_id)

  if (updateError) {
    console.error('[disputes] Failed to update booking status:', updateError)
  }

  return NextResponse.json({ id: dispute.id })
}
