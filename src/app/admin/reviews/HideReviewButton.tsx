'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/language-context'

export function HideReviewButton({ reviewId }: { reviewId: string }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const hide = async () => {
    setLoading(true)
    await fetch(`/api/admin/review/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_visible: false }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <Button size="sm" variant="danger" onClick={hide} loading={loading}>
      {t('admin_hide_review')}
    </Button>
  )
}
