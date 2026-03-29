'use client'
import { useLanguage } from '@/lib/language-context'
import { WEEKDAYS } from '@/lib/constants'

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

  const weekdayKeys = WEEKDAYS.map(w => w.key)

  const daysText = daysAllSet
    ? t('avail_summary_days_all')
    : availableWeekdays
        .sort((a, b) => weekdayKeys.indexOf(a as typeof weekdayKeys[number]) - weekdayKeys.indexOf(b as typeof weekdayKeys[number]))
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
