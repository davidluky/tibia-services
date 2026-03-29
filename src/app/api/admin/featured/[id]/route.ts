import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin,
  unauthorized,
  notFound,
  apiError,
  serverError,
} from '@/lib/api-helpers'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (!auth.authorized) return unauthorized()

  const { data: listing } = await auth.adminClient
    .from('featured_listings')
    .select('id, days_requested, status')
    .eq('id', params.id)
    .single()

  if (!listing) return notFound('Pedido não encontrado.')

  if (listing.status !== 'pending') {
    return apiError('Pedido já foi confirmado ou cancelado.', 409)
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + listing.days_requested * 24 * 60 * 60 * 1000)

  const { error: updateError } = await auth.adminClient
    .from('featured_listings')
    .update({
      status: 'active',
      confirmed_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', params.id)

  if (updateError) {
    console.error('[featured] Failed to confirm listing:', updateError)
    return serverError('Erro ao confirmar pagamento.')
  }

  return NextResponse.json({ success: true })
}
