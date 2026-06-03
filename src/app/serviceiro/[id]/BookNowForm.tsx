'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { GAMEPLAY_TYPES } from '@/lib/constants'
import { useLanguage } from '@/lib/language-context'

interface BookNowFormProps {
  serviceiroId: string
  gameplayTypes: string[]
}

export function BookNowForm({ serviceiroId, gameplayTypes }: BookNowFormProps) {
  const { t } = useLanguage()
  const [serviceType, setServiceType] = useState(gameplayTypes[0] ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleBook = async () => {
    if (!serviceType) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceiro_id: serviceiroId, service_type: serviceType }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? t('booknow_error'))
      setLoading(false)
      return
    }

    router.push(`/bookings/${data.id}`)
  }

  const availableTypes = GAMEPLAY_TYPES.filter(g => gameplayTypes.includes(g.key))

  if (availableTypes.length === 0) {
    return <p className="text-text-muted text-sm">{t('booknow_no_services')}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-sm text-text-muted mb-1 block">{t('booknow_service_label')}</label>
        <select
          value={serviceType}
          onChange={e => setServiceType(e.target.value)}
          className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
        >
          {availableTypes.map(g => (
            <option key={g.key} value={g.key}>{g.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-status-error text-xs">{error}</p>}

      <Button onClick={handleBook} loading={loading} className="w-full">
        {t('booknow_submit')}
      </Button>
      <p className="text-text-muted text-xs text-center">
        {t('booknow_price_note')}
      </p>
    </div>
  )
}
