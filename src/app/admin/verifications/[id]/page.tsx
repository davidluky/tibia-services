import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { VerificationActions } from './VerificationActions'

interface PageProps {
  params: { id: string }
}

export default async function VerificationDetailPage({ params }: PageProps) {
  const admin = createAdminClient()

  const { data: req } = await admin
    .from('verification_requests')
    .select('*, serviceiro:profiles!serviceiro_id(display_name)')
    .eq('id', params.id)
    .single()

  if (!req) notFound()

  // Get signed URLs for files
  const { data: screenshotUrl } = await admin.storage
    .from('verifications')
    .createSignedUrl(req.screenshot_url, 3600)

  const { data: idUrl } = await admin.storage
    .from('verifications')
    .createSignedUrl(req.id_document_url, 3600)

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-text-primary mb-6">Solicitação de verificação</h2>

      <div className="space-y-4 text-sm mb-8">
        <div className="grid grid-cols-2 gap-2">
          <span className="text-text-muted">Serviceiro:</span>
          <span className="text-text-primary">{req.serviceiro?.display_name}</span>
          <span className="text-text-muted">Personagem:</span>
          <span className="text-text-primary">{req.character_name}</span>
          <span className="text-text-muted">Enviado em:</span>
          <span className="text-text-primary">{formatDate(req.submitted_at)}</span>
          <span className="text-text-muted">Taxa paga:</span>
          <span className={req.fee_paid ? 'text-status-success' : 'text-status-warning'}>
            {req.fee_paid ? '✓ Sim' : '⏳ Não confirmado'}
          </span>
          <span className="text-text-muted">Status atual:</span>
          <span className="text-text-primary">{req.status}</span>
        </div>

        {req.admin_notes && (
          <div className="bg-bg-primary border border-border rounded-lg p-3">
            <p className="text-text-muted text-xs mb-1">Notas do admin:</p>
            <p className="text-text-primary">{req.admin_notes}</p>
          </div>
        )}
      </div>

      {/* File previews */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <p className="text-sm text-text-muted mb-2">Screenshot in-game</p>
          {screenshotUrl?.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={screenshotUrl.signedUrl} alt="Screenshot" className="rounded-lg border border-border w-full" />
          ) : (
            <p className="text-text-muted text-xs">Erro ao carregar</p>
          )}
        </div>
        <div>
          <p className="text-sm text-text-muted mb-2">Documento de identidade</p>
          {idUrl?.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={idUrl.signedUrl} alt="ID document" className="rounded-lg border border-border w-full" />
          ) : (
            <p className="text-text-muted text-xs">Erro ao carregar</p>
          )}
        </div>
      </div>

      <VerificationActions requestId={params.id} currentStatus={req.status} feePaid={req.fee_paid} />
    </div>
  )
}
