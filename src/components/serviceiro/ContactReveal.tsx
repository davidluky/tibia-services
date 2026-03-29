'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface ContactRevealProps {
  serviceiroId: string
  isLoggedIn: boolean
}

export function ContactReveal({ serviceiroId, isLoggedIn }: ContactRevealProps) {
  const [contact, setContact] = useState<{ whatsapp: string; discord: string } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReveal = async () => {
    if (!isLoggedIn) {
      window.location.href = '/auth/login'
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/contact/${serviceiroId}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        setLoading(false)
        return
      }

      setContact(data)
      setLoading(false)
    } catch {
      setError('Erro ao carregar contato.')
      setLoading(false)
    }
  }

  if (contact) {
    return (
      <div className="bg-bg-primary border border-gold/20 rounded-xl p-5 space-y-3 animate-fade-in">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Contato</h3>
        <div className="flex items-center gap-3">
          <span className="text-lg">📱</span>
          <div>
            <p className="text-xs text-text-muted">WhatsApp</p>
            <p className="text-text-primary font-medium">{contact.whatsapp}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg">🎮</span>
          <div>
            <p className="text-xs text-text-muted">Discord</p>
            <p className="text-text-primary font-medium">{contact.discord}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-xl p-5">
      <p className="text-sm text-text-muted mb-4">
        {isLoggedIn
          ? 'Faça uma reserva para revelar o contato do serviceiro.'
          : 'Entre na sua conta para ver o contato.'}
      </p>
      {error && <p className="text-status-error text-xs mb-3">{error}</p>}
      <Button onClick={handleReveal} loading={loading} className="w-full">
        {isLoggedIn ? 'Ver Contato' : 'Entrar para ver'}
      </Button>
    </div>
  )
}
