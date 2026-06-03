import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getAuthUser,
  unauthorized,
  notFound,
  forbidden,
  apiError,
  serverError,
} from '@/lib/api-helpers'

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { user } = await getAuthUser()
  if (!user) return unauthorized()

  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('featured_listings')
    .select('id, serviceiro_id, status')
    .eq('id', params.id)
    .single()

  if (!listing) return notFound('Pedido não encontrado.')

  if (listing.serviceiro_id !== user.id) {
    return forbidden('Acesso negado.')
  }

  if (listing.status !== 'pending') {
    return apiError('Apenas pedidos pendentes podem ser cancelados.', 409)
  }

  const { error: updateError } = await admin.from('featured_listings').update({ status: 'canceled' }).eq('id', params.id)

  if (updateError) {
    console.error('[featured] Failed to cancel listing:', updateError)
    return serverError('Erro ao cancelar pedido.')
  }

  return NextResponse.json({ success: true })
}
