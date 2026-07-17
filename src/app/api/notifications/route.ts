import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, unauthorized, badRequest, serverError, parseJsonBody } from '@/lib/api-helpers'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET() {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[notifications] Failed to load notifications:', error)
    return serverError('Erro ao carregar notificações.')
  }

  return NextResponse.json(data ?? [])
}

export async function PATCH(request: NextRequest) {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response
  const { ids } = parsed.data

  if (!Array.isArray(ids) || ids.length === 0) return badRequest('Missing notification ids')
  if (ids.length > 50) return badRequest('Too many ids')
  if (!ids.every(id => typeof id === 'string' && UUID_PATTERN.test(id))) {
    return badRequest('Invalid notification ids')
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .in('id', ids)
    .eq('user_id', user.id)

  if (error) {
    console.error('[notifications] Failed to mark notifications as read:', error)
    return serverError('Erro ao atualizar notificações.')
  }

  return NextResponse.json({ ok: true })
}
