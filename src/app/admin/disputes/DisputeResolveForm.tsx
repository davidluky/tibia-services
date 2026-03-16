'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface DisputeResolveFormProps {
  disputeId: string
}

export function DisputeResolveForm({ disputeId }: DisputeResolveFormProps) {
  const [resolution, setResolution] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleResolve = async () => {
    if (resolution.length < 10 || resolution.length > 500) {
      setError('A resolução deve ter entre 10 e 500 caracteres.')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch(`/api/admin/disputes/${disputeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Erro ao resolver disputa.')
      setLoading(false)
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <label className="text-xs text-text-muted block">Resolução do admin</label>
      <textarea
        value={resolution}
        onChange={e => setResolution(e.target.value)}
        placeholder="Descreva a decisão (10–500 caracteres)"
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
        Resolver
      </Button>
    </div>
  )
}
