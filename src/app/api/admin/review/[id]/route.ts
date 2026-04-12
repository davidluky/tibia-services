import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin,
  unauthorized,
  serverError,
} from '@/lib/api-helpers'

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireAdmin()
  if (!auth.authorized) return unauthorized()

  const { error } = await auth.adminClient
    .from('reviews')
    .update({ is_visible: false })
    .eq('id', params.id)

  if (error) return serverError('Erro ao atualizar.')

  return NextResponse.json({ success: true })
}
