import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const body = await request.json()
  if (typeof body.ban !== 'boolean') {
    return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ is_banned: body.ban })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
