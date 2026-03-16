'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useLanguage } from '@/lib/language-context'

interface ReviewFormProps {
  bookingId: string
  serviceiroId: string
}

export function ReviewForm({ bookingId, serviceiroId }: ReviewFormProps) {
  const { t } = useLanguage()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      setError(t('review_no_rating_error'))
      return
    }

    setLoading(true)
    setError('')

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: bookingId,
        serviceiro_id: serviceiroId,
        rating,
        comment,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <Card className="p-6 text-center">
        <p className="text-4xl mb-3">⭐</p>
        <p className="text-text-primary font-semibold">{t('review_thank_you')}</p>
        <p className="text-text-muted text-sm mt-1">{t('review_thank_you_desc')}</p>
      </Card>
    )
  }

  return (
    <Card className="p-6 space-y-4">
      {/* Star selector */}
      <div>
        <label className="text-sm text-text-muted mb-2 block">{t('review_rating_label')}</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className={`text-3xl transition-colors cursor-pointer ${
                star <= (hovered || rating) ? 'text-gold' : 'text-text-muted/30'
              }`}
            >
              ★
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-xs text-text-muted mt-1">
            {t(`review_rating_${rating}`)}
          </p>
        )}
      </div>

      {/* Comment */}
      <div>
        <label className="text-sm text-text-muted mb-1 block">{t('review_comment_label')}</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={t('review_comment_placeholder')}
          rows={3}
          maxLength={500}
          className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold resize-none"
        />
        <p className="text-xs text-text-muted text-right">{comment.length}/500</p>
      </div>

      {error && (
        <p className="text-status-error text-sm">{error}</p>
      )}

      <Button onClick={handleSubmit} loading={loading} className="w-full">
        {t('review_submit')}
      </Button>
    </Card>
  )
}
