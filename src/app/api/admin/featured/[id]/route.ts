import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('featured_listings')
    .select('id, days_requested, status')
    .eq('id', params.id)
    .single()

  if (!listing) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })

  if (listing.status !== 'pending') {
    return NextResponse.json({ error: 'Pedido já foi confirmado ou cancelado.' }, { status: 409 })
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + listing.days_requested * 24 * 60 * 60 * 1000)

  const { error: updateError } = await admin
    .from('featured_listings')
    .update({
      status: 'active',
      confirmed_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', params.id)

  if (updateError) {
    console.error('[featured] Failed to confirm listing:', updateError)
    return NextResponse.json({ error: 'Erro ao confirmar pagamento.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
