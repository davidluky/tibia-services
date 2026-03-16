'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface FeaturedConfirmFormProps {
  listingId: string
}

export function FeaturedConfirmForm({ listingId }: FeaturedConfirmFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setLoading(true)
    setError('')

    const res = await fetch(`/api/admin/featured/${listingId}`, { method: 'PATCH' })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Erro ao confirmar.')
      setLoading(false)
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="shrink-0">
      {error && <p className="text-status-error text-xs mb-1">{error}</p>}
      <Button size="sm" onClick={handleConfirm} loading={loading}>
        Confirmar pagamento
      </Button>
    </div>
  )
}
