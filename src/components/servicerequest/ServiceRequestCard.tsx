'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/language-context'
import { GAMEPLAY_TYPES } from '@/lib/constants'

export interface ServiceRequest {
  id: string
  service_type: string
  title: string
  description: string | null
  flexible_time: boolean
  preferred_date: string | null
  preferred_time: string | null
  budget_tc: number | null
  status: string
  created_at: string
  customer: { display_name: string | null } | null
}

interface ServiceRequestCardProps {
  request: ServiceRequest
  isServiceiro: boolean
  isLoggedIn: boolean
  isMatch?: boolean
}

export function ServiceRequestCard({ request, isServiceiro, isLoggedIn, isMatch }: ServiceRequestCardProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const gameplayType = GAMEPLAY_TYPES.find(g => g.key === request.service_type)

  const handleOffer = async () => {
    setLoading(true)
    setError('')

    const res = await fetch(`/api/service-requests/${request.id}/apply`, {
      method: 'POST',
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? t('requests_offer_error'))
      setLoading(false)
      return
    }

    router.push(`/bookings/${data.booking_id}`)
  }

  return (
    <Card className="p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text-primary text-base">{request.title}</h3>
          {gameplayType && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {gameplayType.label}
            </span>
          )}
          {isMatch && (
            <span className="inline-block mt-1 ml-1 text-xs px-2 py-0.5 rounded-full bg-status-success/10 text-status-success border border-status-success/20">
              {t('requests_match_badge')}
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-status-success/10 text-status-success border border-status-success/20 font-medium">
          {t('requests_open_badge')}
        </span>
      </div>

      {/* Description */}
      {request.description && (
        <p className="text-text-muted text-sm leading-relaxed">{request.description}</p>
      )}

      {/* Details */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <div className="flex items-center gap-1.5 text-text-muted">
          <span>🕐</span>
          {request.flexible_time ? (
            <span>{t('requests_anytime')}</span>
          ) : (
            <span>
              {request.preferred_date && <span>{request.preferred_date}</span>}
              {request.preferred_date && request.preferred_time && <span> · </span>}
              {request.preferred_time && <span>{request.preferred_time}</span>}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-text-muted">
          <span>💰</span>
          <span>
            {t('requests_budget')}{' '}
            <span className={request.budget_tc ? 'text-gold font-medium' : ''}>
              {request.budget_tc ? `${request.budget_tc} TC` : t('requests_no_budget')}
            </span>
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border gap-3">
        <span className="text-xs text-text-muted">
          {t('requests_posted_by')}{' '}
          <span className="text-text-primary font-medium">
            {request.customer?.display_name ?? '—'}
          </span>
        </span>

        {/* CTA */}
        {isServiceiro ? (
          <div className="flex flex-col items-end gap-1">
            <Button onClick={handleOffer} loading={loading} size="sm">
              {t('requests_offer_btn')}
            </Button>
            {error && <p className="text-status-error text-xs">{error}</p>}
          </div>
        ) : !isLoggedIn ? (
          <Link
            href="/auth/login"
            className="text-xs text-gold hover:text-gold-bright transition-colors"
          >
            {t('requests_login_prompt')}
          </Link>
        ) : null}
      </div>
    </Card>
  )
}
