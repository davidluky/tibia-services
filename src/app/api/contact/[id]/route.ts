// Returns WhatsApp + Discord for a serviceiro IF the requesting user has an
// active or completed booking with them. Never exposes contact to strangers.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  // Verify the user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Check that a qualifying booking exists between this user and the serviceiro
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('serviceiro_id', params.id)
    .eq('customer_id', user.id)
    .in('status', ['active', 'completed'])
    .limit(1)
    .single()

  if (!booking) {
    return NextResponse.json(
      { error: 'Você precisa ter uma reserva ativa com este serviceiro para ver o contato.' },
      { status: 403 }
    )
  }

  // Fetch contact info using admin client (bypasses RLS on contact fields)
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('whatsapp, discord')
    .eq('id', params.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({
    whatsapp: profile.whatsapp ?? 'Não informado',
    discord:  profile.discord  ?? 'Não informado',
  })
}
