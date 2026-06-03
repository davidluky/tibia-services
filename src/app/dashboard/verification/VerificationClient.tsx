'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import type { VerificationRequest } from '@/lib/types'
import { useLanguage } from '@/lib/language-context'

interface VerificationClientProps {
  userId: string
  existing: VerificationRequest | null
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-status-warning',
  approved: 'text-status-success',
  rejected: 'text-status-error',
}

export function VerificationClient({ userId, existing }: VerificationClientProps) {
  const { t } = useLanguage()
  const [characterName, setCharacterName] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [idDocument, setIdDocument] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (existing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-text-primary mb-6">{t('verification_page_title')}</h1>
        <Card className="p-6">
          <h2 className="font-semibold text-text-primary mb-4">{t('verification_your_request')}</h2>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <span className="text-text-muted w-32">{t('verification_status_label')}</span>
              <span className={`font-medium ${STATUS_COLORS[existing.status]}`}>
                {t(`verification_status_${existing.status}`)}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-text-muted w-32">{t('verification_char_display_label')}</span>
              <span className="text-text-primary">{existing.character_name}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-text-muted w-32">{t('verification_fee_label')}</span>
              <span className={existing.fee_paid ? 'text-status-success' : 'text-status-warning'}>
                {existing.fee_paid ? t('verification_fee_yes') : t('verification_fee_pending')}
              </span>
            </div>
            {existing.admin_notes && (
              <div className="mt-4 bg-bg-primary border border-border rounded-lg p-3">
                <p className="text-text-muted text-xs mb-1">{t('verification_admin_notes_label')}</p>
                <p className="text-text-primary text-sm">{existing.admin_notes}</p>
              </div>
            )}
          </div>
          <div className="mt-6">
            <Link href="/dashboard" className="text-gold hover:text-gold-bright text-sm">
              {t('verification_back')}
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-4xl mb-4">✅</p>
        <h1 className="text-2xl font-bold text-text-primary mb-2">{t('verification_submitted_title')}</h1>
        <p className="text-text-muted mb-6">{t('verification_submitted_desc')}</p>
        <Link href="/dashboard" className="text-gold hover:text-gold-bright text-sm">
          {t('verification_back')}
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!screenshot || !idDocument || !characterName) {
      setError(t('verification_error_fields'))
      return
    }

    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('character_name', characterName)
    formData.append('screenshot', screenshot)
    formData.append('id_document', idDocument)

    const res = await fetch('/api/verification', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? t('verification_error_send'))
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-2">{t('verification_title')}</h1>
      <p className="text-text-muted text-sm mb-8">
        {t('verification_intro_prefix')}<strong className="text-gold">✓ Registrado</strong>{t('verification_intro_suffix')}
      </p>

      <Card className="p-6 mb-6">
        <h2 className="font-semibold text-text-primary mb-3">{t('verification_how_title')}</h2>
        <ol className="text-sm text-text-muted space-y-2 list-decimal list-inside">
          <li>{t('verification_step1')}</li>
          <li>{t('verification_step2')}</li>
          <li>{t('verification_step3')}</li>
          <li>{t('verification_step4')}</li>
        </ol>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('verification_char_label')}
          value={characterName}
          onChange={e => setCharacterName(e.target.value)}
          placeholder={t('verification_char_placeholder')}
          required
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm text-text-muted">{t('verification_screenshot_label')}</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setScreenshot(e.target.files?.[0] ?? null)}
            required
            className="text-sm text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:bg-bg-card file:text-text-primary file:text-sm cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-text-muted">{t('verification_id_label')}</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setIdDocument(e.target.files?.[0] ?? null)}
            required
            className="text-sm text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:bg-bg-card file:text-text-primary file:text-sm cursor-pointer"
          />
          <p className="text-xs text-text-muted">{t('verification_id_note')}</p>
        </div>

        {error && (
          <p className="text-status-error text-sm bg-status-error/10 border border-status-error/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} size="lg" className="w-full">
          {t('verification_submit')}
        </Button>
      </form>
    </div>
  )
}
