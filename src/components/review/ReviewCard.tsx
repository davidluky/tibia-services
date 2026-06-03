'use client'
import { Card } from '@/components/ui/Card'
import { Stars } from '@/components/ui/Stars'
import { formatDate } from '@/lib/utils'
import type { Review } from '@/lib/types'
import { useLanguage } from '@/lib/language-context'

interface ReviewCardProps {
  review: Review & { reviewer: { display_name: string } | null }
}

export function ReviewCard({ review }: ReviewCardProps) {
  const { t } = useLanguage()
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-sm font-medium text-text-primary">
            {review.reviewer?.display_name ?? t('review_anonymous')}
          </span>
          <span className="text-text-muted text-xs ml-2">{formatDate(review.created_at)}</span>
        </div>
        <Stars rating={review.rating} />
      </div>
      {review.comment && (
        <p className="text-text-muted text-sm leading-relaxed">{review.comment}</p>
      )}
    </Card>
  )
}
