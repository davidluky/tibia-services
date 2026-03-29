import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { HideReviewButton } from './HideReviewButton'
import { Stars } from '@/components/ui/Stars'
import { truncate } from '@/lib/utils'

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const admin = createAdminClient()
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
      <h2 className="text-2xl font-bold text-text-primary mb-6">Avaliações</h2>

      {!reviews || reviews.length === 0 ? (
        <p className="text-text-muted">Nenhuma avaliação.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-left">
                  <th className="pb-3 pr-4">Revisor</th>
                  <th className="pb-3 pr-4">Serviceiro</th>
                  <th className="pb-3 pr-4">Nota</th>
                  <th className="pb-3 pr-4">Comentário</th>
                  <th className="pb-3 pr-4">Data</th>
                  <th className="pb-3 pr-4">Visível</th>
                  <th className="pb-3">Ação</th>
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
                        {review.is_visible ? 'Sim' : 'Não'}
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
                <a href={`?page=${page - 1}`} className="text-gold hover:text-gold-bright">← Anterior</a>
              )}
              <span className="text-text-muted">Página {page} de {totalPages}</span>
              {page < totalPages && (
                <a href={`?page=${page + 1}`} className="text-gold hover:text-gold-bright">Próxima →</a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
