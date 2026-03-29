'use client'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorRetry } from '@/components/ui/ErrorRetry'

interface VerifyState {
  verification_code: string
  tibia_character: string | null
  tibia_char_verified: boolean
}

export function CharacterVerificationCard() {
  const [state, setState] = useState<VerifyState | null>(null)
  const [loading, setLoading] = useState(true)
  const [characterName, setCharacterName] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [fetchError, setFetchError] = useState(false)
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)

  const fetchVerification = () => {
    setFetchError(false)
    setLoading(true)
    fetch('/api/verify-character')
      .then(r => r.json())
      .then(data => {
        setState(data)
        setFetchError(false)
        setLoading(false)
      })
      .catch(() => {
        setFetchError(true)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchVerification()
  }, [])

  const handleVerify = async () => {
    if (!characterName.trim()) return
    setVerifying(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/verify-character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_name: characterName.trim() }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Erro ao verificar. Tente novamente.')
      setVerifying(false)
      return
    }

    setSuccess(`✓ Personagem verificado: ${data.character_name}`)
    setState(prev => prev ? { ...prev, tibia_character: data.character_name, tibia_char_verified: true } : prev)
    setShowForm(false)
    setVerifying(false)
  }

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-text-muted">Carregando...</p>
      </Card>
    )
  }

  if (fetchError) {
    return (
      <Card className="p-6">
        <ErrorRetry onRetry={fetchVerification} />
      </Card>
    )
  }

  if (!state) return null

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-text-primary mb-3">Personagem Tibia</h2>

      {state.tibia_char_verified && state.tibia_character && !showForm ? (
        <div>
          <p className="text-sm text-text-muted mb-3">
            <span className="text-status-success">✓</span>{' '}
            <span className="text-text-primary font-medium">{state.tibia_character}</span>
            {' '}verificado
          </p>
          <button
            className="text-xs text-text-muted hover:text-gold transition-colors"
            onClick={() => { setShowForm(true); setSuccess('') }}
          >
            Verificar outro personagem
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {!showForm && !state.tibia_char_verified && (
            <p className="text-sm text-text-muted">
              Prove que você joga Tibia adicionando um código ao comentário do seu personagem.
            </p>
          )}

          <div className="bg-bg-primary border border-border rounded-lg p-3 text-sm">
            <p className="text-text-muted text-xs mb-1">Seu código de verificação:</p>
            <code className="text-gold font-mono font-bold">{state.verification_code}</code>
            <p className="text-text-muted text-xs mt-2">
              Adicione este código ao comentário do seu personagem em tibia.com
              (Personagem → Editar → Comentário), depois clique em Verificar.
            </p>
          </div>

          <Input
            label="Nome do personagem"
            value={characterName}
            onChange={e => setCharacterName(e.target.value)}
            placeholder="Ex: Archon Orc"
          />

          {error && (
            <p className="text-status-error text-sm bg-status-error/10 border border-status-error/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-status-success text-sm bg-status-success/10 border border-status-success/20 rounded-md px-3 py-2">
              {success}
            </p>
          )}

          <Button onClick={handleVerify} loading={verifying} className="w-full">
            Verificar
          </Button>
        </div>
      )}
    </Card>
  )
}
