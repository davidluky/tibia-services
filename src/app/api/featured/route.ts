import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getAuthUser,
  unauthorized,
  forbidden,
  badRequest,
  apiError,
  serverError,
  parseJsonBody,
} from '@/lib/api-helpers'

export async function GET() {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') {
    return forbidden('Acesso negado.')
  }

  const admin = createAdminClient()
  const { data: listing } = await admin
    .from('featured_listings')
    .select('*')
    .eq('serviceiro_id', user.id)
    .neq('status', 'canceled')
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ listing: listing ?? null })
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') {
    return forbidden('Acesso negado.')
  }

  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response
  const { tc_amount } = parsed.data

  if (
    typeof tc_amount !== 'number' ||
    !Number.isInteger(tc_amount) ||
    tc_amount < 25 ||
    tc_amount > 750 ||
    tc_amount % 25 !== 0
  ) {
    return badRequest('Valor inválido. Mínimo 25 TC, máximo 750 TC, múltiplo de 25.')
  }

  const admin = createAdminClient()

  // Check for existing active or pending listing
  const { data: existing } = await admin
    .from('featured_listings')
    .select('id, status, expires_at')
    .eq('serviceiro_id', user.id)
    .in('status', ['pending', 'active'])
    .maybeSingle()

  if (existing) {
    // Active listing that hasn't expired yet
    if (existing.status === 'active' && existing.expires_at && new Date(existing.expires_at) > new Date()) {
      return apiError('Você já tem um destaque ativo.', 409)
    }
    // Pending listing (within or past 24h)
    if (existing.status === 'pending') {
      return apiError('Você já tem um pedido de destaque pendente.', 409)
    }
  }

  const { data: listing, error: insertError } = await admin
    .from('featured_listings')
    .insert({ serviceiro_id: user.id, tc_amount })
    .select('id')
    .single()

  if (insertError || !listing) {
    return serverError('Erro ao criar pedido.')
  }

  return NextResponse.json({ id: listing.id })
}
