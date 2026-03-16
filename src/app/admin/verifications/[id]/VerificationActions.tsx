'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useLanguage } from '@/lib/language-context'

interface VerificationActionsProps {
  requestId: string
  currentStatus: string
  feePaid: boolean
}

export function VerificationActions({ requestId, currentStatus, feePaid }: VerificationActionsProps) {
  const { t } = useLanguage()
  const [notes, setNotes] = useState('')
  const [feePaidLocal, setFeePaidLocal] = useState(feePaid)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const doAction = async (action: 'approve' | 'reject' | 'fee_paid') => {
    setLoading(action)
    setError('')

    const res = await fetch(`/api/admin/verify/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, admin_notes: notes, fee_paid: feePaidLocal }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
    } else {
      router.refresh()
    }
    setLoading(null)
  }

  if (currentStatus !== 'pending') {
    return (
      <Card className="p-4">
        <p className="text-text-muted text-sm">{currentStatus === 'approved' ? t('admin_verify_already_approved') : t('admin_verify_already_rejected')}</p>
      </Card>
    )
  }

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-semibold text-text-primary">{t('admin_verify_section_title')}</h3>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={feePaidLocal}
          onChange={e => setFeePaidLocal(e.target.checked)}
          className="accent-gold"
        />
        <span className="text-sm text-text-primary">{t('admin_verify_fee_checkbox')}</span>
      </label>

      <div>
        <label className="text-sm text-text-muted mb-1 block">{t('admin_verify_notes_label')}</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={t('admin_verify_notes_placeholder')}
          rows={3}
          className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold resize-none"
        />
      </div>

      {error && <p className="text-status-error text-sm">{error}</p>}

      <div className="flex gap-3">
        <Button
          onClick={() => doAction('approve')}
          loading={loading === 'approve'}
          className="flex-1"
        >
          {t('admin_verify_approve')}
        </Button>
        <Button
          variant="danger"
          onClick={() => doAction('reject')}
          loading={loading === 'reject'}
          className="flex-1"
        >
          {t('admin_verify_reject')}
        </Button>
      </div>
    </Card>
  )
}
