import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { getServerT } from '@/lib/i18n-server'

export default async function VerificationsPage(
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

  const { data: requests, count } = await admin
    .from('verification_requests')
    .select('*, serviceiro:profiles!serviceiro_id(display_name)', { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range(from, to)

  const totalPages = Math.ceil((count ?? 0) / perPage)

  const STATUS_COLORS: Record<string, string> = {
    pending: 'text-status-warning',
    approved: 'text-status-success',
    rejected: 'text-status-error',
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">{t('admin_verifs_title')}</h2>

      {!requests || requests.length === 0 ? (
        <p className="text-text-muted">{t('admin_verifs_empty')}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-left">
                  <th className="pb-3 pr-4">{t('admin_verifs_col_serviceiro')}</th>
                  <th className="pb-3 pr-4">{t('admin_verifs_col_character')}</th>
                  <th className="pb-3 pr-4">{t('admin_verifs_col_submitted')}</th>
                  <th className="pb-3 pr-4">{t('admin_verifs_col_fee')}</th>
                  <th className="pb-3 pr-4">{t('admin_verifs_col_status')}</th>
                  <th className="pb-3">{t('admin_verifs_col_action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((req: {
                  id: string
                  serviceiro: { display_name: string } | null
                  character_name: string
                  submitted_at: string
                  fee_paid: boolean
                  status: string
                }) => (
                  <tr key={req.id} className="hover:bg-bg-card transition-colors">
                    <td className="py-3 pr-4 text-text-primary">{req.serviceiro?.display_name}</td>
                    <td className="py-3 pr-4 text-text-muted">{req.character_name}</td>
                    <td className="py-3 pr-4 text-text-muted">{formatDate(req.submitted_at)}</td>
                    <td className="py-3 pr-4">
                      <span className={req.fee_paid ? 'text-status-success' : 'text-status-warning'}>
                        {req.fee_paid ? t('admin_verif_fee_yes') : t('admin_verif_fee_no')}
                      </span>
                    </td>
                    <td className={`py-3 pr-4 ${STATUS_COLORS[req.status]}`}>
                      {req.status}
                    </td>
                    <td className="py-3">
                      <Link href={`/admin/verifications/${req.id}`} className="text-gold hover:text-gold-bright text-xs">
                        {t('admin_page_next')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
