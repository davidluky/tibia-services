import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, unauthorized, badRequest, parseJsonBody } from '@/lib/api-helpers'

export async function GET() {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

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

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .in('id', ids)
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
