import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerT } from '@/lib/i18n-server'
import { DisputeResolveForm } from './DisputeResolveForm'

export default async function AdminDisputesPage(
  props: {
    searchParams: Promise<{ page?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const admin = createAdminClient()
  const t = await getServerT()
  const page = Number(searchParams.page ?? 1)
  const perPage = 25
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data: disputes, count } = await admin
    .from('disputes')
    .select(`
      *,
      booking:bookings(id, service_type, customer_id, serviceiro_id),
      opener:profiles!opened_by(display_name)
    `, { count: 'exact' })
    .eq('status', 'open')
    .order('opened_at', { ascending: true })
    .range(from, to)

  const totalPages = Math.ceil((count ?? 0) / perPage)

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">{t('admin_disputes_title')}</h2>

      {!disputes || disputes.length === 0 ? (
        <p className="text-text-muted">{t('admin_disputes_empty')}</p>
      ) : (
        <>
          <div className="space-y-6">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="border border-border rounded-lg p-5 bg-bg-card space-y-3">
                <div className="space-y-1">
                  <p className="text-sm text-text-primary font-medium">
                    {t('admin_disputes_opened_by')}{' '}
                    <span className="text-gold">
                      {(dispute.opener as { display_name: string } | null)?.display_name ?? '—'}
                    </span>
                  </p>
                  {dispute.booking && (
                    <p className="text-xs text-text-muted">
                      {t('admin_disputes_booking')}{' '}
                      <Link
                        href={`/bookings/${(dispute.booking as { id: string }).id}`}
                        className="text-gold hover:text-gold-bright underline"
                      >
                        {(dispute.booking as { id: string }).id.slice(0, 8)}…
                      </Link>
                      {' '}· {t('admin_disputes_service')}{' '}
                      <span className="text-text-primary">
                        {(dispute.booking as { service_type: string }).service_type}
                      </span>
                    </p>
                  )}
                  <p className="text-sm text-text-primary mt-2">{dispute.reason}</p>
                </div>
                <DisputeResolveForm disputeId={dispute.id} />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex gap-2 mt-4 text-sm">
              {page > 1 && (
                <a href={`?page=${page - 1}`} className="text-gold hover:text-gold-bright">{t('admin_page_prev')}</a>
              )}
              <span className="text-text-muted">{t('admin_page_of')} {page} {t('admin_page_of_total')} {totalPages}</span>
              {page < totalPages && (
                <a href={`?page=${page + 1}`} className="text-gold hover:text-gold-bright">{t('admin_page_next')}</a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
