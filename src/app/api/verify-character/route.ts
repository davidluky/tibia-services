import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireServerEnv } from '@/lib/env'
import {
  getAuthUser,
  unauthorized,
  forbidden,
  badRequest,
  notFound,
  apiError,
  serverError,
  parseJsonBody,
  checkActionRateLimit,
} from '@/lib/api-helpers'

function generateVerificationCode(userId: string): string {
  const secret = requireServerEnv('CHAR_VERIFY_SECRET')
  const hmac = createHmac('sha256', secret).update(userId).digest('hex')
  return `TIBS-${hmac.slice(0, 8).toUpperCase()}`
}

export async function GET() {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  // Verify role is serviceiro
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') {
    return forbidden('Acesso negado.')
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
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  // Verify role is serviceiro
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
  const { character_name } = parsed.data

  // Validate character name: non-empty, max 30 chars, letters and spaces only
  if (!character_name || typeof character_name !== 'string') {
    return badRequest('Nome do personagem é obrigatório.')
  }
  const trimmed = character_name.trim()
  if (!/^[a-zA-Z ]{1,30}$/.test(trimmed)) {
    return badRequest('Nome inválido. Use apenas letras e espaços (máx. 30 caracteres).')
  }

  const verificationCode = generateVerificationCode(user.id)
  const rateLimited = await checkActionRateLimit(user.id, 'verify_character', 10 * 60_000, 5)
  if (rateLimited) {
    return apiError('Muitas tentativas. Aguarde antes de tentar novamente.', 429)
  }

  // Fetch character from TibiaData API v4
  let characterData: { name: string; comment: string | null } | null = null
  try {
    const res = await fetch(
      `https://api.tibiadata.com/v4/character/${encodeURIComponent(trimmed)}`,
      { next: { revalidate: 0 }, signal: AbortSignal.timeout(8000) } // no caching
    )
    if (!res.ok) {
      return apiError('Não foi possível verificar o personagem. Tente novamente.', 502)
    }
    const data = await res.json()
    const char = data?.character?.character
    if (!char || !char.name) {
      return notFound('Personagem não encontrado no Tibia.')
    }
    characterData = { name: char.name, comment: char.comment ?? null }
  } catch {
    return apiError('Não foi possível verificar o personagem. Tente novamente.', 502)
  }

  // Check if comment contains the verification code (case-insensitive)
  const commentUpper = (characterData.comment ?? '').toUpperCase()
  if (!commentUpper.includes(verificationCode)) {
    return badRequest('Código de verificação não encontrado no comentário do personagem.')
  }

  // Verify serviceiro_profiles row exists before updating
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('serviceiro_profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existing) return notFound('Perfil de serviceiro não encontrado.')

  // Update with verified character name (use API-normalized name)
  const { error: updateError } = await admin.from('serviceiro_profiles').update({
    tibia_character: characterData.name,
    tibia_char_verified: true,
  }).eq('id', user.id)

  if (updateError) {
    console.error('[verify-character] Failed to update profile:', updateError)
    return serverError('Erro ao salvar verificação. Tente novamente.')
  }

  return NextResponse.json({ success: true, character_name: characterData.name })
}
