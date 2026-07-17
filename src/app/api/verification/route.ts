import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getAuthUser,
  unauthorized,
  forbidden,
  badRequest,
  apiError,
  serverError,
  checkActionRateLimit,
  rejectOversizedRequest,
} from '@/lib/api-helpers'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_MULTIPART_SIZE = 11 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const EXT: Record<(typeof ALLOWED_MIME_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

async function hasValidImageSignature(file: File): Promise<boolean> {
  try {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())

    if (file.type === 'image/jpeg') {
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    }

    if (file.type === 'image/png') {
      const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      return bytes.length >= png.length && png.every((value, index) => bytes[index] === value)
    }

    if (file.type === 'image/webp') {
      const ascii = (start: number, value: string) =>
        [...value].every((character, index) => bytes[start + index] === character.charCodeAt(0))
      return bytes.length >= 12 && ascii(0, 'RIFF') && ascii(8, 'WEBP')
    }

    return false
  } catch {
    return false
  }
}

async function cleanupVerificationUploads(
  admin: ReturnType<typeof createAdminClient>,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return

  const { error } = await admin.storage.from('verifications').remove(paths)
  if (error) {
    console.error('[verification] Failed to remove orphaned uploads:', error)
  }
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  const oversized = rejectOversizedRequest(request, MAX_MULTIPART_SIZE, { requireContentLength: true })
  if (oversized) return oversized

  // Verify user is a serviceiro
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') {
    return forbidden('Somente serviceiros podem solicitar verificação.')
  }

  // Check for existing pending request
  const { data: existing, error: existingError } = await supabase
    .from('verification_requests')
    .select('id, status')
    .eq('serviceiro_id', user.id)
    .in('status', ['pending', 'approved'])
    .limit(1)
    .maybeSingle()

  if (existingError) {
    console.error('[verification] Failed to check existing request:', existingError)
    return serverError('Erro ao verificar solicitação existente.')
  }

  if (existing) {
    return apiError('Você já tem uma solicitação ativa.', 409)
  }

  const rateLimited = await checkActionRateLimit(user.id, 'identity_verification_upload', 60 * 60_000, 3)
  if (rateLimited) {
    return apiError('Muitas solicitações. Aguarde antes de tentar novamente.', 429)
  }

  const formData = await request.formData()
  const characterName = formData.get('character_name')
  const screenshot = formData.get('screenshot')
  const idDocument = formData.get('id_document')

  if (typeof characterName !== 'string' || !(screenshot instanceof File) || !(idDocument instanceof File)) {
    return badRequest('Dados incompletos.')
  }

  const trimmedCharacterName = characterName.trim()
  if (!trimmedCharacterName || trimmedCharacterName.length > 100) {
    return badRequest('Nome de personagem inválido.')
  }

  if (
    !ALLOWED_MIME_TYPES.includes(screenshot.type as (typeof ALLOWED_MIME_TYPES)[number]) ||
    !ALLOWED_MIME_TYPES.includes(idDocument.type as (typeof ALLOWED_MIME_TYPES)[number])
  ) {
    return badRequest('Somente imagens JPG, PNG ou WebP são permitidas.')
  }

  if (screenshot.size > MAX_FILE_SIZE || idDocument.size > MAX_FILE_SIZE) {
    return badRequest('Arquivo muito grande. Máximo 5MB.')
  }

  const [validScreenshot, validIdDocument] = await Promise.all([
    hasValidImageSignature(screenshot),
    hasValidImageSignature(idDocument),
  ])
  if (!validScreenshot || !validIdDocument) {
    return badRequest('O conteúdo do arquivo não corresponde a uma imagem JPG, PNG ou WebP válida.')
  }

  // Upload files using admin client (service role required for storage writes)
  const admin = createAdminClient()

  const screenshotPath = `${user.id}/screenshot-${crypto.randomUUID()}.${EXT[screenshot.type as keyof typeof EXT]}`
  const idPath = `${user.id}/id-${crypto.randomUUID()}.${EXT[idDocument.type as keyof typeof EXT]}`

  const [screenshotUpload, idUpload] = await Promise.all([
    admin.storage.from('verifications').upload(screenshotPath, await screenshot.arrayBuffer(), {
      contentType: screenshot.type,
    }),
    admin.storage.from('verifications').upload(idPath, await idDocument.arrayBuffer(), {
      contentType: idDocument.type,
    }),
  ])

  if (screenshotUpload.error || idUpload.error) {
    const uploadedPaths = [
      !screenshotUpload.error ? screenshotPath : null,
      !idUpload.error ? idPath : null,
    ].filter((path): path is string => path !== null)
    await cleanupVerificationUploads(admin, uploadedPaths)
    console.error('[verification] Upload failed:', screenshotUpload.error ?? idUpload.error)
    return serverError('Erro ao fazer upload dos arquivos.')
  }

  // Create verification request
  const { error } = await supabase
    .from('verification_requests')
    .insert({
      serviceiro_id: user.id,
      character_name: trimmedCharacterName,
      screenshot_url: screenshotPath,
      id_document_url: idPath,
    })

  if (error) {
    await cleanupVerificationUploads(admin, [screenshotPath, idPath])
    if (error.code === '23505') {
      return apiError('Você já tem uma solicitação ativa.', 409)
    }
    console.error('[verification] Failed to create request:', error)
    return serverError('Erro ao criar solicitação.')
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
