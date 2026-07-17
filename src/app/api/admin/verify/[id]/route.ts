import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin,
  unauthorized,
  badRequest,
  apiError,
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

  if (action !== 'approve' && action !== 'reject' && action !== 'fee_paid') {
    return badRequest('Ação inválida.')
  }
  if (action === 'approve' && fee_paid !== true) {
    return badRequest('Confirme o pagamento da taxa antes de aprovar.')
  }

  // Capture the private object paths before review. The database review is
  // committed first; object deletion is intentionally best-effort afterwards.
  const { data: req } = await auth.adminClient
    .from('verification_requests')
    .select('serviceiro_id, screenshot_url, id_document_url')
    .eq('id', params.id)
    .single()

  if (!req) return notFound('Solicitação não encontrada.')

  if (action === 'approve' || action === 'reject') {
    const { error: reviewError } = await auth.adminClient.rpc('review_verification_request', {
      p_request_id: params.id,
      p_reviewed_by: auth.user.id,
      p_action: action,
      p_admin_notes: sanitizedAdminNotes,
      p_fee_paid: fee_paid ?? false,
    })

    if (reviewError) {
      if (reviewError.message.includes('verification_not_pending')) {
        return apiError('Solicitação já revisada.', 409)
      }
      if (reviewError.message.includes('verification_request_not_found')) {
        return notFound('Solicitação não encontrada.')
      }
      if (reviewError.message.includes('reviewer_not_admin')) {
        return apiError('Administrador sem permissão para revisar.', 403)
      }
      if (reviewError.message.includes('verification_fee_not_paid')) {
        return badRequest('Confirme o pagamento da taxa antes de aprovar.')
      }
      console.error('[verification-review] Transaction failed:', reviewError)
      return serverError()
    }

    const privatePaths = [req.screenshot_url, req.id_document_url]
      .filter((path): path is string => typeof path === 'string' && path.length > 0)
    if (privatePaths.length > 0) {
      const { error: cleanupError } = await auth.adminClient.storage
        .from('verifications')
        .remove(privatePaths)
      if (cleanupError) {
        console.error('[verification-review] Failed to remove reviewed private files:', cleanupError)
      }
    }
  } else {
    const { error: feeError } = await auth.adminClient.from('verification_requests').update({
      fee_paid: true,
    }).eq('id', params.id)
    if (feeError) return serverError()
  }

  return NextResponse.json({ success: true })
}
