import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin,
  unauthorized,
  badRequest,
  notFound,
  apiError,
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
  const { resolution } = parsed.data

  if (typeof resolution !== 'string' || resolution.length < 10 || resolution.length > 500) {
    return badRequest('A resolução deve ter entre 10 e 500 caracteres.')
  }

  const { data: dispute } = await auth.adminClient
    .from('disputes')
    .select('id, booking_id, status')
    .eq('id', params.id)
    .single()

  if (!dispute) return notFound('Disputa não encontrada.')

  if (dispute.status !== 'open') {
    return apiError('Disputa já foi resolvida.', 409)
  }

  const { error: resolveError } = await auth.adminClient.rpc('resolve_booking_dispute', {
    p_dispute_id: params.id,
    p_resolved_by: auth.user.id,
    p_resolution: sanitizeText(resolution),
  })

  if (resolveError) {
    console.error('[disputes] Failed to resolve dispute:', resolveError)
    return serverError('Erro ao resolver disputa.')
  }

  return NextResponse.json({ success: true })
}
