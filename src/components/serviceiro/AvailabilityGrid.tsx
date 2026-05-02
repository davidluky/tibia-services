'use client'
import { useId } from 'react'
import { useLanguage } from '@/lib/language-context'
import { WEEKDAYS } from '@/lib/constants'

interface AvailabilityGridProps {
  availableWeekdays: string[]
  availableFrom: string | null  // "HH:MM"
  availableTo: string | null    // "HH:MM"
  timezoneOffset: number
}

function parseHour(time: string): number {
  return parseInt(time.split(':')[0], 10)
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

function isWithinRange(hour: number, from: number, to: number): boolean {
  if (from === to) return true
  if (from < to) return hour >= from && hour < to
  // Crosses midnight (e.g. from=18, to=2)
  return hour >= from || hour < to
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function AvailabilityGrid({
  availableWeekdays,
  availableFrom,
  availableTo,
  timezoneOffset,
}: AvailabilityGridProps) {
  const { t } = useLanguage()
  const titleId = useId()
  const legendId = useId()
  const timezoneId = useId()

  const DAYS = WEEKDAYS.map(w => ({
    key: w.key,
    label: t(`avail_${w.key}` as Parameters<typeof t>[0]),
  }))

  const fromHour = availableFrom ? parseHour(availableFrom) : null
  const toHour = availableTo ? parseHour(availableTo) : null
  const availableLabel = t('avail_legend_available')
  const busyLabel = t('avail_legend_busy')
  const offLabel = t('avail_legend_off')

  return (
    <div>
      <h2 id={titleId} className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
        {t('avail_title')}
      </h2>

      <div className="overflow-x-auto">
        <div
          className="min-w-max space-y-1"
          role="table"
          aria-labelledby={titleId}
          aria-describedby={`${legendId} ${timezoneId}`}
        >
          {/* Hour labels */}
          <div className="flex items-center gap-px ml-10" role="row">
            {HOURS.map(h => (
              <div
                key={h}
                role="columnheader"
                aria-label={formatHour(h)}
                className="w-[18px] text-center text-[9px] text-text-muted select-none"
              >
                {h % 6 === 0 ? String(h).padStart(2, '0') : ''}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {DAYS.map(({ key, label }) => {
            const isAvailDay = availableWeekdays.includes(key)

            return (
              <div key={key} className="flex items-center gap-px" role="row">
                {/* Day label */}
                <span className="w-9 shrink-0 text-right pr-1.5 text-xs font-medium text-text-muted select-none" role="rowheader">
                  {label}
                </span>

                {/* Hour cells */}
                {HOURS.map(h => {
                  let cellClass: string
                  let statusLabel: string

                  if (!isAvailDay) {
                    cellClass = 'bg-border'
                    statusLabel = offLabel
                  } else if (fromHour !== null && toHour !== null) {
                    const isAvailable = isWithinRange(h, fromHour, toHour)
                    cellClass = isAvailable
                      ? 'bg-status-success'
                      : 'bg-status-error/80'
                    statusLabel = isAvailable ? availableLabel : busyLabel
                  } else {
                    cellClass = 'bg-status-success'
                    statusLabel = availableLabel
                  }

                  const hourLabel = formatHour(h)

                  return (
                    <div
                      key={h}
                      role="cell"
                      aria-label={`${label} ${hourLabel}: ${statusLabel}`}
                      title={`${label} ${hourLabel} - ${statusLabel}`}
                      className={`w-[18px] h-[18px] rounded-[3px] ${cellClass} cursor-default`}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div id={legendId} className="flex flex-wrap gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <div aria-hidden="true" className="w-3 h-3 rounded-[3px] bg-status-success" />
          <span className="text-xs text-text-muted">{availableLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div aria-hidden="true" className="w-3 h-3 rounded-[3px] bg-status-error/80" />
          <span className="text-xs text-text-muted">{busyLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div aria-hidden="true" className="w-3 h-3 rounded-[3px] bg-border" />
          <span className="text-xs text-text-muted">{offLabel}</span>
        </div>
      </div>

      {/* Timezone */}
      <p id={timezoneId} className="text-xs text-text-muted mt-2">
        UTC{timezoneOffset >= 0 ? '+' : ''}{timezoneOffset}
      </p>
    </div>
  )
}
