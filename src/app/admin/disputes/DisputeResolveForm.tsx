'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/language-context'

interface DisputeResolveFormProps {
  disputeId: string
}

export function DisputeResolveForm({ disputeId }: DisputeResolveFormProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [resolution, setResolution] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleResolve = async () => {
    if (resolution.length < 10 || resolution.length > 500) {
      setError(t('admin_dispute_length_error'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      })

      let data: { error?: string } = {}
      try {
        data = await res.json()
      } catch {
        // non-JSON response
      }
      if (!res.ok) {
        setError(data.error ?? t('admin_dispute_resolve_error'))
      } else {
        router.refresh()
      }
    } catch {
      setError(t('admin_dispute_connection_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <label className="text-xs text-text-muted block">{t('admin_dispute_resolution_label')}</label>
      <textarea
        value={resolution}
        onChange={e => setResolution(e.target.value)}
        placeholder={t('admin_dispute_resolution_placeholder')}
        rows={3}
        maxLength={500}
        className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold resize-none"
      />
      <p className="text-xs text-text-muted text-right">{resolution.length}/500</p>
      {error && <p className="text-status-error text-xs">{error}</p>}
      <Button
        size="sm"
        onClick={handleResolve}
        loading={loading}
      >
        {t('admin_dispute_resolve_btn')}
      </Button>
    </div>
  )
}
