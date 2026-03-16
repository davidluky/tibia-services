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

export async function POST(request: Request) {
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

  const body = await request.json()
  const { character_name } = body

  // Validate character name: non-empty, max 30 chars, letters and spaces only
  if (!character_name || typeof character_name !== 'string') {
    return NextResponse.json({ error: 'Nome do personagem é obrigatório.' }, { status: 400 })
  }
  const trimmed = character_name.trim()
  if (!/^[a-zA-Z ]{1,30}$/.test(trimmed)) {
    return NextResponse.json({ error: 'Nome inválido. Use apenas letras e espaços (máx. 30 caracteres).' }, { status: 400 })
  }

  const verificationCode = generateVerificationCode(user.id)

  // Fetch character from TibiaData API v4
  let characterData: { name: string; comment: string | null } | null = null
  try {
    const res = await fetch(
      `https://api.tibiadata.com/v4/character/${encodeURIComponent(trimmed)}`,
      { next: { revalidate: 0 } } // no caching
    )
    if (!res.ok) {
      return NextResponse.json({ error: 'Não foi possível verificar o personagem. Tente novamente.' }, { status: 502 })
    }
    const data = await res.json()
    const char = data?.character?.character
    if (!char || !char.name) {
      return NextResponse.json({ error: 'Personagem não encontrado no Tibia.' }, { status: 404 })
    }
    characterData = { name: char.name, comment: char.comment ?? null }
  } catch {
    return NextResponse.json({ error: 'Não foi possível verificar o personagem. Tente novamente.' }, { status: 502 })
  }

  // Check if comment contains the verification code (case-insensitive)
  const commentUpper = (characterData.comment ?? '').toUpperCase()
  if (!commentUpper.includes(verificationCode)) {
    return NextResponse.json({
      error: 'Código de verificação não encontrado no comentário do personagem.',
    }, { status: 400 })
  }

  // Verify serviceiro_profiles row exists before updating
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('serviceiro_profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Perfil de serviceiro não encontrado.' }, { status: 404 })
  }

  // Update with verified character name (use API-normalized name)
  const { error: updateError } = await admin.from('serviceiro_profiles').update({
    tibia_character: characterData.name,
    tibia_char_verified: true,
  }).eq('id', user.id)

  if (updateError) {
    console.error('[verify-character] Failed to update profile:', updateError)
    return NextResponse.json({ error: 'Erro ao salvar verificação. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, character_name: characterData.name })
}
