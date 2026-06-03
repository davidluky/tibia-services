'use client'
import { Button } from './Button'
import { useLanguage } from '@/lib/language-context'

interface ErrorRetryProps {
  message?: string
  onRetry: () => void
  loading?: boolean
}

export function ErrorRetry({ message, onRetry, loading }: ErrorRetryProps) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <p className="text-status-error text-sm">
        {message ?? t('error_generic')}
      </p>
      <Button size="sm" variant="secondary" onClick={onRetry} loading={loading}>
        {t('error_retry')}
      </Button>
    </div>
  )
}
