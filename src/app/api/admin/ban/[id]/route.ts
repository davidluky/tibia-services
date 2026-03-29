import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from '@/lib/api-helpers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (!auth.authorized) return unauthorized()

  const body = await request.json()
  if (typeof body.ban !== 'boolean') {
    return badRequest('Valor inválido.')
  }

  const { error } = await auth.adminClient
    .from('profiles')
    .update({ is_banned: body.ban })
    .eq('id', params.id)

  if (error) return serverError('Erro ao atualizar.')

  return NextResponse.json({ success: true })
}
