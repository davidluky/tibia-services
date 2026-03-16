'use client'
import { useLanguage } from '@/lib/language-context'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

interface Props {
  availableWeekdays: string[]
  availableFrom: string | null
  availableTo: string | null
  timezoneOffset: number
}

export function AvailabilitySummary({ availableWeekdays, availableFrom, availableTo, timezoneOffset }: Props) {
  const { t } = useLanguage()

  if (availableWeekdays.length === 0) {
    return (
      <p className="text-sm text-text-muted mb-3">{t('avail_summary_days_none')}</p>
    )
  }

  const daysAllSet = new Set(availableWeekdays).size === 7

  const daysText = daysAllSet
    ? t('avail_summary_days_all')
    : availableWeekdays
        .sort((a, b) => DAY_KEYS.indexOf(a as typeof DAY_KEYS[number]) - DAY_KEYS.indexOf(b as typeof DAY_KEYS[number]))
        .map(d => t(`avail_${d}` as Parameters<typeof t>[0]))
        .join(', ')

  const hoursText = availableFrom && availableTo
    ? t('avail_summary_hours_range').replace('{from}', availableFrom).replace('{to}', availableTo)
    : t('avail_summary_hours_any')

  const tzOffset = timezoneOffset >= 0 ? `+${timezoneOffset}` : String(timezoneOffset)
  const tzText = t('avail_summary_timezone').replace('{offset}', tzOffset)

  return (
    <p className="text-sm text-text-muted mb-3">
      {daysText} · {hoursText} · {tzText}
    </p>
  )
}
