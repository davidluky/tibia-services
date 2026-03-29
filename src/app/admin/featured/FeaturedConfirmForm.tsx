'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/language-context'

interface FeaturedConfirmFormProps {
  listingId: string
}

export function FeaturedConfirmForm({ listingId }: FeaturedConfirmFormProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/featured/${listingId}`, { method: 'PATCH' })
      let data: { error?: string } = {}
      try {
        data = await res.json()
      } catch {
        // non-JSON response
      }
      if (!res.ok) {
        setError(data.error ?? t('admin_featured_confirm_error'))
      } else {
        router.refresh()
      }
    } catch {
      setError(t('admin_featured_connection_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="shrink-0">
      {error && <p className="text-status-error text-xs mb-1">{error}</p>}
      <Button size="sm" onClick={handleConfirm} loading={loading}>
        {t('admin_featured_confirm_btn')}
      </Button>
    </div>
  )
}
