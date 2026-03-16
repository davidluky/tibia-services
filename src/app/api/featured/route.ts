import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
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
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }
  const { tc_amount } = body

  if (
    typeof tc_amount !== 'number' ||
    !Number.isInteger(tc_amount) ||
    tc_amount < 25 ||
    tc_amount > 750 ||
    tc_amount % 25 !== 0
  ) {
    return NextResponse.json(
      { error: 'Valor inválido. Mínimo 25 TC, máximo 750 TC, múltiplo de 25.' },
      { status: 400 }
    )
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
      return NextResponse.json({ error: 'Você já tem um destaque ativo.' }, { status: 409 })
    }
    // Pending listing (within or past 24h)
    if (existing.status === 'pending') {
      return NextResponse.json({ error: 'Você já tem um pedido de destaque pendente.' }, { status: 409 })
    }
  }

  const { data: listing, error: insertError } = await admin
    .from('featured_listings')
    .insert({ serviceiro_id: user.id, tc_amount })
    .select('id')
    .single()

  if (insertError || !listing) {
    return NextResponse.json({ error: 'Erro ao criar pedido.' }, { status: 500 })
  }

  return NextResponse.json({ id: listing.id })
}
