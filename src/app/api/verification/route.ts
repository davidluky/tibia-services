import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getAuthUser,
  unauthorized,
  forbidden,
  badRequest,
  apiError,
  serverError,
} from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

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
  const { data: existing } = await supabase
    .from('verification_requests')
    .select('id, status')
    .eq('serviceiro_id', user.id)
    .in('status', ['pending', 'approved'])
    .single()

  if (existing) {
    return apiError('Você já tem uma solicitação ativa.', 409)
  }

  const formData = await request.formData()
  const characterName = formData.get('character_name') as string
  const screenshot = formData.get('screenshot') as File
  const idDocument = formData.get('id_document') as File

  if (!characterName || !screenshot || !idDocument) {
    return badRequest('Dados incompletos.')
  }

  if (typeof characterName !== 'string' || characterName.length > 100) {
    return badRequest('Nome de personagem inválido.')
  }

  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  if (!ALLOWED_MIME_TYPES.includes(screenshot.type) || !ALLOWED_MIME_TYPES.includes(idDocument.type)) {
    return badRequest('Somente imagens JPG, PNG ou WebP são permitidas.')
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  if (screenshot.size > MAX_FILE_SIZE || idDocument.size > MAX_FILE_SIZE) {
    return badRequest('Arquivo muito grande. Máximo 5MB.')
  }

  const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

  // Upload files using admin client (service role required for storage writes)
  const admin = createAdminClient()

  const screenshotPath = `${user.id}/screenshot-${crypto.randomUUID()}.${EXT[screenshot.type]}`
  const idPath = `${user.id}/id-${crypto.randomUUID()}.${EXT[idDocument.type]}`

  const [screenshotUpload, idUpload] = await Promise.all([
    admin.storage.from('verifications').upload(screenshotPath, await screenshot.arrayBuffer(), {
      contentType: screenshot.type,
    }),
    admin.storage.from('verifications').upload(idPath, await idDocument.arrayBuffer(), {
      contentType: idDocument.type,
    }),
  ])

  if (screenshotUpload.error || idUpload.error) {
    return serverError('Erro ao fazer upload dos arquivos.')
  }

  // Create verification request
  const { error } = await supabase
    .from('verification_requests')
    .insert({
      serviceiro_id: user.id,
      character_name: characterName,
      screenshot_url: screenshotPath,
      id_document_url: idPath,
    })

  if (error) return serverError('Erro ao criar solicitação.')

  return NextResponse.json({ success: true }, { status: 201 })
}
