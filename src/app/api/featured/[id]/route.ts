import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('featured_listings')
    .select('id, serviceiro_id, status')
    .eq('id', params.id)
    .single()

  if (!listing) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })

  if (listing.serviceiro_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  if (listing.status !== 'pending') {
    return NextResponse.json({ error: 'Apenas pedidos pendentes podem ser cancelados.' }, { status: 409 })
  }

  await admin.from('featured_listings').update({ status: 'canceled' }).eq('id', params.id)

  return NextResponse.json({ success: true })
}
