import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin,
  unauthorized,
  badRequest,
  notFound,
} from '@/lib/api-helpers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (!auth.authorized) return unauthorized()

  const body = await request.json()
  const { action, admin_notes, fee_paid } = body

  if (admin_notes !== undefined && (typeof admin_notes !== 'string' || admin_notes.length > 1000)) {
    return badRequest('Notas inválidas.')
  }
  if (fee_paid !== undefined && typeof fee_paid !== 'boolean') {
    return badRequest('Valor inválido.')
  }

  // Fetch the request
  const { data: req } = await auth.adminClient
    .from('verification_requests')
    .select('serviceiro_id')
    .eq('id', params.id)
    .single()

  if (!req) return notFound('Solicitação não encontrada.')

  if (action === 'approve') {
    // Update verification request
    await auth.adminClient.from('verification_requests').update({
      status: 'approved',
      admin_notes: admin_notes || null,
      fee_paid: fee_paid ?? false,
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
    }).eq('id', params.id)

    // Set is_registered on serviceiro profile
    await auth.adminClient.from('serviceiro_profiles').update({
      is_registered: true,
      registered_at: new Date().toISOString(),
    }).eq('id', req.serviceiro_id)

  } else if (action === 'reject') {
    await auth.adminClient.from('verification_requests').update({
      status: 'rejected',
      admin_notes: admin_notes || null,
      fee_paid: fee_paid ?? false,
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
    }).eq('id', params.id)

  } else if (action === 'fee_paid') {
    await auth.adminClient.from('verification_requests').update({
      fee_paid: true,
    }).eq('id', params.id)

  } else {
    return badRequest('Ação inválida.')
  }

  return NextResponse.json({ success: true })
}
