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
    try {
      const res = await fetch(`/api/admin/featured/${listingId}`, { method: 'PATCH' })
      let data: { error?: string } = {}
      try {
        data = await res.json()
      } catch {
        // non-JSON response
      }
      if (!res.ok) {
        setError(data.error ?? 'Erro ao confirmar.')
      } else {
        window.location.reload()
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
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
