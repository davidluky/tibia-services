import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin,
  unauthorized,
  badRequest,
  notFound,
  serverError,
  parseJsonBody,
} from '@/lib/api-helpers'
import { sanitizeText } from '@/lib/utils'

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireAdmin()
  if (!auth.authorized) return unauthorized()

  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response
  const { action, admin_notes, fee_paid } = parsed.data

  if (admin_notes !== undefined && (typeof admin_notes !== 'string' || admin_notes.length > 1000)) {
    return badRequest('Notas inválidas.')
  }
  if (fee_paid !== undefined && typeof fee_paid !== 'boolean') {
    return badRequest('Valor inválido.')
  }
  const sanitizedAdminNotes = typeof admin_notes === 'string' && admin_notes.trim()
    ? sanitizeText(admin_notes)
    : null

  // Fetch the request
  const { data: req } = await auth.adminClient
    .from('verification_requests')
    .select('serviceiro_id')
    .eq('id', params.id)
    .single()

  if (!req) return notFound('Solicitação não encontrada.')

  if (action === 'approve') {
    // Update verification request
    const { error: verifyError } = await auth.adminClient.from('verification_requests').update({
      status: 'approved',
      admin_notes: sanitizedAdminNotes,
      fee_paid: fee_paid ?? false,
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
    }).eq('id', params.id)
    if (verifyError) return serverError()

    // Set is_registered on serviceiro profile
    const { error: profileError } = await auth.adminClient.from('serviceiro_profiles').update({
      is_registered: true,
      registered_at: new Date().toISOString(),
    }).eq('id', req.serviceiro_id)
    if (profileError) return serverError()

  } else if (action === 'reject') {
    const { error: rejectError } = await auth.adminClient.from('verification_requests').update({
      status: 'rejected',
      admin_notes: sanitizedAdminNotes,
      fee_paid: fee_paid ?? false,
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
    }).eq('id', params.id)
    if (rejectError) return serverError()

  } else if (action === 'fee_paid') {
    const { error: feeError } = await auth.adminClient.from('verification_requests').update({
      fee_paid: true,
    }).eq('id', params.id)
    if (feeError) return serverError()

  } else {
    return badRequest('Ação inválida.')
  }

  return NextResponse.json({ success: true })
}
