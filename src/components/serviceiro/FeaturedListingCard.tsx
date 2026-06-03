'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/language-context'
import type { FeaturedListing } from '@/lib/types'

const RECEIVING_CHARACTER = 'Cursos Senai'
const TC_PER_DAY = 25
const TIMEOUT_MS = 24 * 60 * 60 * 1000 // 24 hours

function hoursRemaining(requestedAt: string): number {
  const elapsed = Date.now() - new Date(requestedAt).getTime()
  return Math.max(0, Math.ceil((TIMEOUT_MS - elapsed) / (60 * 60 * 1000)))
}

function isTimedOut(requestedAt: string): boolean {
  return Date.now() - new Date(requestedAt).getTime() > TIMEOUT_MS
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function daysRemaining(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
}

export function FeaturedListingCard() {
  const { t } = useLanguage()
  const [listing, setListing] = useState<FeaturedListing | null | undefined>(undefined)
  const [days, setDays] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [error, setError] = useState('')

  const fetchListing = () => {
    fetch('/api/featured')
      .then(r => r.json())
      .then(data => {
        const l = data.listing ?? null
        // Treat expired active listing as null (allow requesting new one)
        if (l && l.status === 'active' && l.expires_at && new Date(l.expires_at) <= new Date()) {
          setListing(null)
        } else {
          setListing(l)
        }
      })
      .catch(() => setListing(null))
  }

  useEffect(() => { fetchListing() }, [])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tc_amount: days * TC_PER_DAY }),
      })
      let data: { error?: string; id?: string } = {}
      try {
        data = await res.json()
      } catch {
        // non-JSON response — fall through to generic error
      }
      if (!res.ok) {
        setError(data.error ?? t('featured_error_generic'))
        setSubmitting(false)
        return
      }
      fetchListing()
      toast.success(t('featured_toast_success'))
    } catch {
      setError(t('featured_error_generic'))
    }
    setSubmitting(false)
  }

  const handleCancel = async () => {
    if (!listing) return
    setCanceling(true)
    setError('')
    try {
      const res = await fetch(`/api/featured/${listing.id}`, { method: 'DELETE' })
      // Treat 404 and 409 as success (listing already gone or inactive)
      if (res.ok || res.status === 404 || res.status === 409) {
        setListing(null)
        toast.success(t('featured_toast_cancelled'))
      } else {
        let data: { error?: string } = {}
        try {
          data = await res.json()
        } catch {
          // non-JSON response — fall through to generic error
        }
        setError(data.error ?? t('featured_error_cancel'))
      }
    } catch {
      setError(t('featured_error_cancel'))
    }
    setCanceling(false)
  }

  // Loading
  if (listing === undefined) {
    return (
      <Card className="p-6">
        <p className="text-sm text-text-muted">Carregando...</p>
      </Card>
    )
  }

  const tcAmount = days * TC_PER_DAY

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-text-primary mb-3">⭐ {t('featured_card_title')}</h2>

      {/* State 5: Active */}
      {listing && listing.status === 'active' && listing.expires_at && new Date(listing.expires_at) > new Date() && (
        <div className="space-y-2">
          <p className="text-sm text-status-success font-medium">✓ {t('featured_active_msg')}</p>
          <p className="text-sm text-text-muted">
            {t('featured_valid_until')} <span className="text-text-primary">{formatDate(listing.expires_at)}</span>
            {' '}({daysRemaining(listing.expires_at)} {t('featured_days_remaining')})
          </p>
          <p className="text-xs text-text-muted mt-2">
            {t('featured_extend_note')}
          </p>
        </div>
      )}

      {/* State 3: Pending within 24h */}
      {listing && listing.status === 'pending' && !isTimedOut(listing.requested_at) && (
        <div className="space-y-3">
          <p className="text-sm text-text-primary font-medium">{t('featured_pending_msg')}</p>
          <div className="bg-bg-primary border border-border rounded-lg p-3 text-sm">
            <p className="text-text-muted text-xs mb-1">{t('featured_send_exact')}</p>
            <p className="text-gold font-bold font-mono">{listing.tc_amount} TC</p>
            <p className="text-text-muted text-xs mt-1">
              {t('featured_to_char')} <span className="text-text-primary font-medium">{RECEIVING_CHARACTER}</span>
            </p>
          </div>
          <p className="text-xs text-text-muted">
            {t('featured_expires_in')} <span className="text-text-primary">{hoursRemaining(listing.requested_at)}h</span>.
          </p>
          {error && <p className="text-status-error text-sm">{error}</p>}
          <Button variant="danger" size="sm" onClick={handleCancel} loading={canceling} className="w-full">
            {t('featured_cancel_btn')}
          </Button>
        </div>
      )}

      {/* State 4: Timed out */}
      {listing && listing.status === 'pending' && isTimedOut(listing.requested_at) && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            {t('featured_timed_out')}
          </p>
          {error && <p className="text-status-error text-sm">{error}</p>}
          <Button size="sm" onClick={handleCancel} loading={canceling} className="w-full">
            {t('featured_request_new')}
          </Button>
        </div>
      )}

      {/* State 2: No listing */}
      {!listing && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            {t('featured_promo_text')}
          </p>

          <div className="flex items-center gap-3">
            <label className="text-sm text-text-muted shrink-0">{t('featured_days_label')}</label>
            <input
              type="number"
              min={1}
              max={30}
              step={1}
              value={days}
              onChange={e => setDays(Math.min(30, Math.max(1, Number(e.target.value))))}
              className="w-20 bg-bg-primary border border-border rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-gold"
            />
            <span className="text-sm text-gold font-medium">{tcAmount} TC</span>
          </div>

          <div className="bg-bg-primary border border-border rounded-lg p-3 text-sm">
            <p className="text-text-muted text-xs mb-1">{t('featured_instructions')}</p>
            <p className="text-gold font-bold font-mono">{tcAmount} TC</p>
            <p className="text-text-muted text-xs mt-1">
              {t('featured_to_char')} <span className="text-text-primary font-medium">{RECEIVING_CHARACTER}</span>
            </p>
          </div>

          {error && <p className="text-status-error text-sm">{error}</p>}

          <Button onClick={handleSubmit} loading={submitting} className="w-full">
            {t('featured_submit_btn')}
          </Button>
        </div>
      )}
    </Card>
  )
}
