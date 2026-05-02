import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
  parseJsonBody,
} from '@/lib/api-helpers'

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireAdmin()
  if (!auth.authorized) return unauthorized()

  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response
  const body = parsed.data
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
