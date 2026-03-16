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
  const { action, admin_notes, fee_paid } = body

  if (admin_notes !== undefined && (typeof admin_notes !== 'string' || admin_notes.length > 1000)) {
    return NextResponse.json({ error: 'Notas inválidas.' }, { status: 400 })
  }
  if (fee_paid !== undefined && typeof fee_paid !== 'boolean') {
    return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
  }
  const admin = createAdminClient()

  // Fetch the request
  const { data: req } = await admin
    .from('verification_requests')
    .select('serviceiro_id')
    .eq('id', params.id)
    .single()

  if (!req) return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 })

  if (action === 'approve') {
    // Update verification request
    await admin.from('verification_requests').update({
      status: 'approved',
      admin_notes: admin_notes || null,
      fee_paid: fee_paid ?? false,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    }).eq('id', params.id)

    // Set is_registered on serviceiro profile
    await admin.from('serviceiro_profiles').update({
      is_registered: true,
      registered_at: new Date().toISOString(),
    }).eq('id', req.serviceiro_id)

  } else if (action === 'reject') {
    await admin.from('verification_requests').update({
      status: 'rejected',
      admin_notes: admin_notes || null,
      fee_paid: fee_paid ?? false,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    }).eq('id', params.id)

  } else if (action === 'fee_paid') {
    await admin.from('verification_requests').update({
      fee_paid: true,
    }).eq('id', params.id)

  } else {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
