import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { getServerT } from '@/lib/i18n-server'
import { HideReviewButton } from './HideReviewButton'
import { Stars } from '@/components/ui/Stars'
import { truncate } from '@/lib/utils'

export default async function ReviewsPage(
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

  const { data: reviews, count } = await admin
    .from('reviews')
    .select(`
      *,
      reviewer:profiles!reviewer_id(display_name),
      serviceiro:profiles!serviceiro_id(display_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalPages = Math.ceil((count ?? 0) / perPage)

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">{t('admin_reviews_title')}</h2>

      {!reviews || reviews.length === 0 ? (
        <p className="text-text-muted">{t('admin_reviews_empty')}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-left">
                  <th className="pb-3 pr-4">{t('admin_reviews_col_reviewer')}</th>
                  <th className="pb-3 pr-4">{t('admin_reviews_col_serviceiro')}</th>
                  <th className="pb-3 pr-4">{t('admin_reviews_col_rating')}</th>
                  <th className="pb-3 pr-4">{t('admin_reviews_col_comment')}</th>
                  <th className="pb-3 pr-4">{t('admin_reviews_col_date')}</th>
                  <th className="pb-3 pr-4">{t('admin_reviews_col_visible')}</th>
                  <th className="pb-3">{t('admin_reviews_col_action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews.map((review: {
                  id: string
                  reviewer: { display_name: string } | null
                  serviceiro: { display_name: string } | null
                  rating: number
                  comment: string | null
                  created_at: string
                  is_visible: boolean
                }) => (
                  <tr key={review.id} className={`hover:bg-bg-card transition-colors ${!review.is_visible ? 'opacity-50' : ''}`}>
                    <td className="py-3 pr-4 text-text-primary">{review.reviewer?.display_name}</td>
                    <td className="py-3 pr-4 text-text-muted">{review.serviceiro?.display_name}</td>
                    <td className="py-3 pr-4"><Stars rating={review.rating} /></td>
                    <td className="py-3 pr-4 text-text-muted max-w-xs">
                      {review.comment ? truncate(review.comment, 60) : '—'}
                    </td>
                    <td className="py-3 pr-4 text-text-muted">{formatDate(review.created_at)}</td>
                    <td className="py-3 pr-4">
                      <span className={review.is_visible ? 'text-status-success' : 'text-status-error'}>
                        {review.is_visible ? t('admin_yes') : t('admin_no')}
                      </span>
                    </td>
                    <td className="py-3">
                      {review.is_visible && <HideReviewButton reviewId={review.id} />}
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
