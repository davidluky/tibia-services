'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/language-context'

interface UserActionsProps {
  userId: string
  isBanned: boolean
}

export function UserActions({ userId, isBanned }: UserActionsProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    setLoading(true)
    await fetch(`/api/admin/ban/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ban: !isBanned }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <Button
      size="sm"
      variant={isBanned ? 'secondary' : 'danger'}
      onClick={toggle}
      loading={loading}
    >
      {isBanned ? t('admin_unban_user') : t('admin_ban_user')}
    </Button>
  )
}
