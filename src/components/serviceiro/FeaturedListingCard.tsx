'use client'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { FeaturedListing } from '@/lib/types'

const RECEIVING_CHARACTER = 'Cursos Senai'
const TC_PER_DAY = 25
const TIMEOUT_MS = 24 * 60 * 60 * 1000 // 24 hours

function hoursRemaining(requestedAt: string): number {
  const elapsed = Date.now() - new Date(requestedAt).getTime()
  return Math.max(0, Math.ceil((TIMEOUT_MS - elapsed) / (60 * 60 * 1000)))
}

function isTimedOut(requestedAt: string): boolean {
  return Date.now() - new Date(requestedAt).getTime() > TIMEOUT_MS
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function daysRemaining(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
}

export function FeaturedListingCard() {
  const [listing, setListing] = useState<FeaturedListing | null | undefined>(undefined)
  const [days, setDays] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [error, setError] = useState('')

  const fetchListing = () => {
    fetch('/api/featured')
      .then(r => r.json())
      .then(data => setListing(data.listing ?? null))
      .catch(() => setListing(null))
  }

  useEffect(() => { fetchListing() }, [])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/featured', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tc_amount: days * TC_PER_DAY }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Erro ao solicitar destaque.')
      setSubmitting(false)
      return
    }
    fetchListing()
    setSubmitting(false)
  }

  const handleCancel = async () => {
    if (!listing) return
    setCanceling(true)
    setError('')
    const res = await fetch(`/api/featured/${listing.id}`, { method: 'DELETE' })
    // Treat 404 and 409 as success (listing already gone or inactive)
    if (res.ok || res.status === 404 || res.status === 409) {
      setListing(null)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Erro ao cancelar.')
    }
    setCanceling(false)
  }

  // Loading
  if (listing === undefined) {
    return (
      <Card className="p-6">
        <p className="text-sm text-text-muted">Carregando...</p>
      </Card>
    )
  }

  const tcAmount = days * TC_PER_DAY

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-text-primary mb-3">⭐ Destaque de Perfil</h2>

      {/* State 5: Active */}
      {listing && listing.status === 'active' && listing.expires_at && new Date(listing.expires_at) > new Date() && (
        <div className="space-y-2">
          <p className="text-sm text-status-success font-medium">✓ Seu perfil está em destaque</p>
          <p className="text-sm text-text-muted">
            Válido até <span className="text-text-primary">{formatDate(listing.expires_at)}</span>
            {' '}({daysRemaining(listing.expires_at)} dias restantes)
          </p>
          <p className="text-xs text-text-muted mt-2">
            Para estender, entre em contato com o admin após o vencimento.
          </p>
        </div>
      )}

      {/* State 3: Pending within 24h */}
      {listing && listing.status === 'pending' && !isTimedOut(listing.requested_at) && (
        <div className="space-y-3">
          <p className="text-sm text-text-primary font-medium">Aguardando confirmação do pagamento.</p>
          <div className="bg-bg-primary border border-border rounded-lg p-3 text-sm">
            <p className="text-text-muted text-xs mb-1">Envie exatamente:</p>
            <p className="text-gold font-bold font-mono">{listing.tc_amount} TC</p>
            <p className="text-text-muted text-xs mt-1">
              para o personagem <span className="text-text-primary font-medium">{RECEIVING_CHARACTER}</span> em tibia.com
            </p>
          </div>
          <p className="text-xs text-text-muted">
            Seu pedido expira em <span className="text-text-primary">{hoursRemaining(listing.requested_at)}h</span>.
          </p>
          {error && <p className="text-status-error text-sm">{error}</p>}
          <Button variant="danger" size="sm" onClick={handleCancel} loading={canceling} className="w-full">
            Cancelar pedido
          </Button>
        </div>
      )}

      {/* State 4: Timed out */}
      {listing && listing.status === 'pending' && isTimedOut(listing.requested_at) && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Pagamento não confirmado em 24h. Pedido cancelado automaticamente.
          </p>
          {error && <p className="text-status-error text-sm">{error}</p>}
          <Button size="sm" onClick={handleCancel} loading={canceling} className="w-full">
            Solicitar novo destaque
          </Button>
        </div>
      )}

      {/* State 2: No listing */}
      {!listing && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Destaque seu perfil no topo da busca e apareça com um badge especial.
          </p>

          <div className="flex items-center gap-3">
            <label className="text-sm text-text-muted shrink-0">Dias de destaque:</label>
            <input
              type="number"
              min={1}
              max={30}
              step={1}
              value={days}
              onChange={e => setDays(Math.min(30, Math.max(1, Number(e.target.value))))}
              className="w-20 bg-bg-primary border border-border rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-gold"
            />
            <span className="text-sm text-gold font-medium">{tcAmount} TC</span>
          </div>

          <div className="bg-bg-primary border border-border rounded-lg p-3 text-sm">
            <p className="text-text-muted text-xs mb-1">Após solicitar, envie exatamente:</p>
            <p className="text-gold font-bold font-mono">{tcAmount} TC</p>
            <p className="text-text-muted text-xs mt-1">
              para o personagem <span className="text-text-primary font-medium">{RECEIVING_CHARACTER}</span> em tibia.com.
              Seu perfil será destacado assim que o pagamento for confirmado (em até 24h).
            </p>
          </div>

          {error && <p className="text-status-error text-sm">{error}</p>}

          <Button onClick={handleSubmit} loading={submitting} className="w-full">
            Solicitar Destaque
          </Button>
        </div>
      )}
    </Card>
  )
}
