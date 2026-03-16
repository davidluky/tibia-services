import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function generateVerificationCode(userId: string): string {
  const secret = process.env.CHAR_VERIFY_SECRET ?? 'dev-secret'
  const hmac = createHmac('sha256', secret).update(userId).digest('hex')
  return `TIBS-${hmac.slice(0, 8).toUpperCase()}`
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Verify role is serviceiro
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  // Fetch current verification state
  const admin = createAdminClient()
  const { data: sp } = await admin
    .from('serviceiro_profiles')
    .select('tibia_character, tibia_char_verified')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    verification_code: generateVerificationCode(user.id),
    tibia_character: sp?.tibia_character ?? null,
    tibia_char_verified: sp?.tibia_char_verified ?? false,
  })
}
