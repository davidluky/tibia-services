'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { GAMEPLAY_TYPES } from '@/lib/constants'
import { isValidTC, snapToTC } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export function NewRequestForm() {
  const { t } = useLanguage()
  const router = useRouter()

  const [serviceType, setServiceType] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [timePreference, setTimePreference] = useState<'flexible' | 'scheduled'>('flexible')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [budgetRaw, setBudgetRaw] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!serviceType) newErrors.serviceType = t('requests_error_type')
    if (title.trim().length < 5 || title.trim().length > 100) newErrors.title = t('requests_error_title')
    if (description && description.length > 500) newErrors.description = t('requests_error_desc')

    if (timePreference === 'scheduled') {
      if (!preferredDate) {
        newErrors.date = t('requests_error_date_required')
      } else {
        const today = new Date().toISOString().slice(0, 10)
        if (preferredDate < today) newErrors.date = t('requests_error_date_past')
      }
    }

    if (budgetRaw) {
      const parsed = parseInt(budgetRaw, 10)
      if (isNaN(parsed) || !isValidTC(parsed)) newErrors.budget = t('requests_error_budget')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError('')
    if (!validate()) return

    setLoading(true)

    const budget_tc = budgetRaw ? snapToTC(parseInt(budgetRaw, 10)) : null

    const res = await fetch('/api/service-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_type: serviceType,
        title: title.trim(),
        description: description.trim() || null,
        time_preference: timePreference,
        preferred_date: timePreference === 'scheduled' ? preferredDate : null,
        preferred_time: timePreference === 'scheduled' ? preferredTime || null : null,
        budget_tc,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setLoading(false)
      if (res.status === 401) {
        setApiError(t('requests_error_session'))
      } else if (res.status === 403) {
        setApiError(t('requests_error_role'))
      } else {
        setApiError(t('requests_error_generic'))
      }
      return
    }

    router.push('/servicos')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t('requests_novo_title')}</h1>
        <p className="text-text-muted mt-2 text-sm">{t('requests_novo_subtitle')}</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* API error banner */}
          {apiError && (
            <div className="bg-status-error/10 border border-status-error/30 rounded-md px-4 py-3">
              <p className="text-status-error text-sm">{apiError}</p>
            </div>
          )}

          {/* Service type */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t('requests_field_type')} *
            </label>
            <select
              value={serviceType}
              onChange={e => setServiceType(e.target.value)}
              className="w-full bg-bg-card border border-border rounded-md px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-gold/50"
            >
              <option value="">—</option>
              {GAMEPLAY_TYPES.map(g => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
            {errors.serviceType && (
              <p className="text-status-error text-xs mt-1">{errors.serviceType}</p>
            )}
          </div>

          {/* Title */}
          <Input
            label={`${t('requests_field_title')} *`}
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            error={errors.title}
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t('requests_field_desc')}
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full bg-bg-card border border-border rounded-md px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-gold/50 resize-none"
            />
            {errors.description && (
              <p className="text-status-error text-xs mt-1">{errors.description}</p>
            )}
            <p className="text-text-muted text-xs mt-1 text-right">{description.length}/500</p>
          </div>

          {/* Time preference */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t('requests_field_time')}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="time_preference"
                  checked={timePreference === 'flexible'}
                  onChange={() => setTimePreference('flexible')}
                  className="accent-gold"
                />
                <span className="text-sm text-text-primary">{t('requests_field_flexible')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="time_preference"
                  checked={timePreference === 'scheduled'}
                  onChange={() => setTimePreference('scheduled')}
                  className="accent-gold"
                />
                <span className="text-sm text-text-primary">{t('requests_field_scheduled')}</span>
              </label>
            </div>

            {timePreference === 'scheduled' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">{t('requests_field_date')}</label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={e => setPreferredDate(e.target.value)}
                    className="w-full bg-bg-card border border-border rounded-md px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-gold/50"
                  />
                  {errors.date && (
                    <p className="text-status-error text-xs mt-1">{errors.date}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">{t('requests_field_time_input')}</label>
                  <input
                    type="time"
                    value={preferredTime}
                    onChange={e => setPreferredTime(e.target.value)}
                    className="w-full bg-bg-card border border-border rounded-md px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-gold/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Budget */}
          <Input
            label={t('requests_field_budget')}
            type="number"
            value={budgetRaw}
            onChange={e => setBudgetRaw(e.target.value)}
            placeholder="0"
            min={25}
            max={100000}
            step={25}
            error={errors.budget}
          />

          {/* Submit */}
          <Button type="submit" loading={loading} className="w-full">
            {loading ? t('requests_submitting') : t('requests_submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
