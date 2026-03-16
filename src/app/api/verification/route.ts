import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Verify user is a serviceiro
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') {
    return NextResponse.json({ error: 'Somente serviceiros podem solicitar verificação.' }, { status: 403 })
  }

  // Check for existing pending request
  const { data: existing } = await supabase
    .from('verification_requests')
    .select('id, status')
    .eq('serviceiro_id', user.id)
    .in('status', ['pending', 'approved'])
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Você já tem uma solicitação ativa.' }, { status: 409 })
  }

  const formData = await request.formData()
  const characterName = formData.get('character_name') as string
  const screenshot = formData.get('screenshot') as File
  const idDocument = formData.get('id_document') as File

  if (!characterName || !screenshot || !idDocument) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
  }

  if (typeof characterName !== 'string' || characterName.length > 100) {
    return NextResponse.json({ error: 'Nome de personagem inválido.' }, { status: 400 })
  }

  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  if (!ALLOWED_MIME_TYPES.includes(screenshot.type) || !ALLOWED_MIME_TYPES.includes(idDocument.type)) {
    return NextResponse.json({ error: 'Somente imagens JPG, PNG ou WebP são permitidas.' }, { status: 400 })
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  if (screenshot.size > MAX_FILE_SIZE || idDocument.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 5MB.' }, { status: 400 })
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
    return NextResponse.json({ error: 'Erro ao fazer upload dos arquivos.' }, { status: 500 })
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

  if (error) {
    return NextResponse.json({ error: 'Erro ao criar solicitação.' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
