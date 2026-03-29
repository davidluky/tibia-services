'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { VOCATIONS, GAMEPLAY_TYPES, WEEKDAYS } from '@/lib/constants'
import { sanitizeText } from '@/lib/utils'
import type { Profile } from '@/lib/types'
import { useLanguage } from '@/lib/language-context'
import { CharacterVerificationCard } from '@/components/serviceiro/CharacterVerificationCard'
import { FeaturedListingCard } from '@/components/serviceiro/FeaturedListingCard'

interface DashboardClientProps {
  profile: Profile
  serviceiroProfile: {
    vocations: string[]
    gameplay_types: string[]
    available_weekdays: string[]
    available_from: string | null
    available_to: string | null
    timezone_offset: number
    is_registered: boolean
  } | null
  userId: string
}

export function DashboardClient({ profile, serviceiroProfile, userId }: DashboardClientProps) {
  const { t } = useLanguage()

  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? '')
  const [discord, setDiscord] = useState(profile.discord ?? '')

  const [vocations, setVocations] = useState<string[]>(serviceiroProfile?.vocations ?? [])
  const [gameplayTypes, setGameplayTypes] = useState<string[]>(serviceiroProfile?.gameplay_types ?? [])
  const [weekdays, setWeekdays] = useState<string[]>(serviceiroProfile?.available_weekdays ?? [])
  const [availFrom, setAvailFrom] = useState(serviceiroProfile?.available_from ?? '')
  const [availTo, setAvailTo] = useState(serviceiroProfile?.available_to ?? '')
  const [tzOffset, setTzOffset] = useState(serviceiroProfile?.timezone_offset ?? -3)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  // Auto-detect browser timezone for first-time setup
  useEffect(() => {
    if (serviceiroProfile?.timezone_offset == null) {
      try {
        const offsetMinutes = -new Date().getTimezoneOffset()
        const offsetHours = Math.round(offsetMinutes / 60)
        setTzOffset(offsetHours)
      } catch {
        // keep default
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (list: string[], setList: (v: string[]) => void, key: string) => {
    setList(list.includes(key) ? list.filter(x => x !== key) : [...list, key])
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)

    const profileRes = await supabase.from('profiles').update({
      display_name: sanitizeText(displayName),
      bio: bio ? sanitizeText(bio) : null,
      whatsapp: whatsapp || null,
      discord: discord || null,
    }).eq('id', userId)

    let spError = null
    if (profile.role === 'serviceiro') {
      const spRes = await supabase.from('serviceiro_profiles').update({
        vocations,
        gameplay_types: gameplayTypes,
        available_weekdays: weekdays,
        available_from: availFrom || null,
        available_to: availTo || null,
        timezone_offset: tzOffset,
      }).eq('id', userId)
      spError = spRes.error
    }

    if (profileRes.error || spError) {
      setError(t('dashboard_save_error'))
      toast.error(t('dashboard_save_error'))
    } else {
      setSaved(true)
      toast.success(t('dashboard_save_toast_success'))
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-text-primary">{t('dashboard_title')}</h1>
        <div className="flex gap-3">
          <Link href="/bookings" className="text-gold hover:text-gold-bright text-sm transition-colors">
            {t('dashboard_my_bookings')}
          </Link>
          {profile.role === 'serviceiro' && !serviceiroProfile?.is_registered && (
            <Link href="/dashboard/verification" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
              {t('dashboard_request_verification')}
            </Link>
          )}
        </div>
      </div>

      {serviceiroProfile?.is_registered && (
        <div className="bg-gold/10 border border-gold/20 rounded-xl px-4 py-3 text-gold text-sm font-medium">
          {t('dashboard_verified_badge')}
        </div>
      )}

      {/* Profile info */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-text-primary">{t('dashboard_profile_section')}</h2>
        <Input
          label={t('dashboard_name_label')}
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder={t('dashboard_name_placeholder')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm text-text-muted">{t('dashboard_bio_label')}</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder={t('dashboard_bio_placeholder')}
            rows={3}
            maxLength={500}
            className="bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold resize-none"
          />
        </div>
        <Input
          label={t('dashboard_whatsapp_label')}
          value={whatsapp}
          onChange={e => setWhatsapp(e.target.value)}
          placeholder={t('dashboard_whatsapp_placeholder')}
        />
        <Input
          label={t('dashboard_discord_label')}
          value={discord}
          onChange={e => setDiscord(e.target.value)}
          placeholder={t('dashboard_discord_placeholder')}
        />
      </Card>

      {/* Serviceiro-only sections */}
      {profile.role === 'serviceiro' && (
        <>
          {/* Vocations */}
          <Card className="p-6">
            <h2 className="font-semibold text-text-primary mb-4">{t('dashboard_vocations_section')}</h2>
            <div className="flex flex-wrap gap-2">
              {VOCATIONS.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => toggle(vocations, setVocations, v.key)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                    vocations.includes(v.key)
                      ? 'bg-gold/10 text-gold border-gold/30'
                      : 'border-border text-text-muted hover:border-gold/30'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Gameplay types */}
          <Card className="p-6">
            <h2 className="font-semibold text-text-primary mb-4">{t('dashboard_gameplay_section')}</h2>
            <div className="flex flex-wrap gap-2">
              {GAMEPLAY_TYPES.map(g => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => toggle(gameplayTypes, setGameplayTypes, g.key)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                    gameplayTypes.includes(g.key)
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'border-border text-text-muted hover:border-blue-500/30'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Availability */}
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-text-primary">{t('dashboard_availability_section')}</h2>

            <div>
              <label className="text-sm text-text-muted mb-2 block">{t('dashboard_weekdays_label')}</label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(w => (
                  <button
                    key={w.key}
                    type="button"
                    onClick={() => toggle(weekdays, setWeekdays, w.key)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                      weekdays.includes(w.key)
                        ? 'bg-gold/10 text-gold border-gold/30'
                        : 'border-border text-text-muted hover:border-gold/30'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('dashboard_time_from_label')}
                type="time"
                value={availFrom}
                onChange={e => setAvailFrom(e.target.value)}
              />
              <Input
                label={t('dashboard_time_to_label')}
                type="time"
                value={availTo}
                onChange={e => setAvailTo(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-text-muted mb-1 block">{t('dashboard_timezone_label')}</label>
              <select
                value={tzOffset}
                onChange={e => setTzOffset(Number(e.target.value))}
                className="bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              >
                {[-5, -4, -3, -2, 0, 1, 2, 3].map(offset => (
                  <option key={offset} value={offset}>
                    UTC{offset >= 0 ? '+' : ''}{offset} {offset === -3 ? '(Brasil/BRT)' : offset === 0 ? '(UTC)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <CharacterVerificationCard />
          <FeaturedListingCard />
        </>
      )}

      {error && (
        <p className="text-status-error text-sm bg-status-error/10 border border-status-error/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {saved && (
        <p className="text-status-success text-sm bg-status-success/10 border border-status-success/20 rounded-md px-3 py-2">
          {t('dashboard_save_success')}
        </p>
      )}

      <Button onClick={handleSave} loading={saving} size="lg" className="w-full">
        {t('dashboard_save')}
      </Button>
    </div>
  )
}
