import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin-auth'
import { formatDate } from '@/lib/utils'
import { getServerT } from '@/lib/i18n-server'
import { VerificationActions } from './VerificationActions'

interface AdminVerificationDetailRow {
  id: string
  character_name: string
  screenshot_url: string
  id_document_url: string
  fee_paid: boolean
  status: string
  admin_notes: string | null
  submitted_at: string
  serviceiro: { display_name: string } | null
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VerificationDetailPage(props: PageProps) {
  const params = await props.params;
  const { adminClient: admin } = await requireAdminPage()
  const t = await getServerT()

  const { data: req } = await admin
    .from('verification_requests')
    .select('id, character_name, screenshot_url, id_document_url, fee_paid, status, admin_notes, submitted_at, serviceiro:profiles!serviceiro_id(display_name)')
    .eq('id', params.id)
    .single()
    .overrideTypes<AdminVerificationDetailRow, { merge: false }>()

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
      <h2 className="text-2xl font-bold text-text-primary mb-6">{t('admin_verif_request_title')}</h2>
      <div className="space-y-4 text-sm mb-8">
        <div className="grid grid-cols-2 gap-2">
          <span className="text-text-muted">{t('admin_verif_serviceiro')}</span>
          <span className="text-text-primary">{req.serviceiro?.display_name}</span>
          <span className="text-text-muted">{t('admin_verif_character')}</span>
          <span className="text-text-primary">{req.character_name}</span>
          <span className="text-text-muted">{t('admin_verif_submitted_at')}</span>
          <span className="text-text-primary">{formatDate(req.submitted_at)}</span>
          <span className="text-text-muted">{t('admin_verif_fee_paid')}</span>
          <span className={req.fee_paid ? 'text-status-success' : 'text-status-warning'}>
            {req.fee_paid ? t('admin_verif_fee_yes') : t('admin_verif_fee_no')}
          </span>
          <span className="text-text-muted">{t('admin_verif_current_status')}</span>
          <span className="text-text-primary">{req.status}</span>
        </div>

        {req.admin_notes && (
          <div className="bg-bg-primary border border-border rounded-lg p-3">
            <p className="text-text-muted text-xs mb-1">{t('admin_verif_notes_label')}</p>
            <p className="text-text-primary">{req.admin_notes}</p>
          </div>
        )}
      </div>
      {/* File previews */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <p className="text-sm text-text-muted mb-2">{t('admin_verif_screenshot')}</p>
          {screenshotUrl?.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            (<img src={screenshotUrl.signedUrl} alt="Screenshot" className="rounded-lg border border-border w-full" />)
          ) : (
            <p className="text-text-muted text-xs">{t('admin_verif_load_error')}</p>
          )}
        </div>
        <div>
          <p className="text-sm text-text-muted mb-2">{t('admin_verif_id_document')}</p>
          {idUrl?.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            (<img src={idUrl.signedUrl} alt="ID document" className="rounded-lg border border-border w-full" />)
          ) : (
            <p className="text-text-muted text-xs">{t('admin_verif_load_error')}</p>
          )}
        </div>
      </div>
      <VerificationActions requestId={params.id} currentStatus={req.status} feePaid={req.fee_paid} />
    </div>
  );
}
