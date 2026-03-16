import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const body = await request.json()
  const { resolution } = body

  if (typeof resolution !== 'string' || resolution.length < 10 || resolution.length > 500) {
    return NextResponse.json({ error: 'A resolução deve ter entre 10 e 500 caracteres.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: dispute } = await admin
    .from('disputes')
    .select('id, booking_id, status')
    .eq('id', params.id)
    .single()

  if (!dispute) return NextResponse.json({ error: 'Disputa não encontrada.' }, { status: 404 })

  if (dispute.status !== 'open') {
    return NextResponse.json({ error: 'Disputa já foi resolvida.' }, { status: 409 })
  }

  const { error: disputeUpdateError } = await admin.from('disputes').update({
    status: 'resolved',
    resolution,
    resolved_by: user.id,
    resolved_at: new Date().toISOString(),
  }).eq('id', params.id)

  if (disputeUpdateError) {
    console.error('[disputes] Failed to resolve dispute:', disputeUpdateError)
    return NextResponse.json({ error: 'Erro ao resolver disputa.' }, { status: 500 })
  }

  const { error: bookingError } = await admin
    .from('bookings')
    .update({ status: 'resolved' })
    .eq('id', dispute.booking_id)

  if (bookingError) {
    console.error('[disputes] Failed to update booking status to resolved:', bookingError)
  }

  return NextResponse.json({ success: true })
}
