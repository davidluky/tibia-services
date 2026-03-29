// Returns WhatsApp + Discord for a serviceiro IF the requesting user has an
// active or completed booking with them. Never exposes contact to strangers.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getAuthUser,
  unauthorized,
  forbidden,
  notFound,
} from '@/lib/api-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

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
    return forbidden('Você precisa ter uma reserva ativa com este serviceiro para ver o contato.')
  }

  // Fetch contact info using admin client (bypasses RLS on contact fields)
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('whatsapp, discord')
    .eq('id', params.id)
    .single()

  if (!profile) return notFound('Perfil não encontrado.')

  return NextResponse.json({
    whatsapp: profile.whatsapp ?? 'Não informado',
    discord:  profile.discord  ?? 'Não informado',
  })
}
