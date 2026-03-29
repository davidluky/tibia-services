'use client'
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

  const DAYS = WEEKDAYS.map(w => ({
    key: w.key,
    label: t(`avail_${w.key}` as Parameters<typeof t>[0]),
  }))

  const fromHour = availableFrom ? parseHour(availableFrom) : null
  const toHour = availableTo ? parseHour(availableTo) : null

  return (
    <div>
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
        {t('avail_title')}
      </h2>

      <div className="overflow-x-auto">
        <div className="min-w-max space-y-1">
          {/* Hour labels */}
          <div className="flex items-center gap-px ml-10">
            {HOURS.map(h => (
              <div key={h} className="w-[18px] text-center text-[9px] text-text-muted/40 select-none">
                {h % 6 === 0 ? String(h).padStart(2, '0') : ''}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {DAYS.map(({ key, label }) => {
            const isAvailDay = availableWeekdays.includes(key)

            return (
              <div key={key} className="flex items-center gap-px">
                {/* Day label */}
                <span className="w-9 shrink-0 text-right pr-1.5 text-xs font-medium text-text-muted select-none">
                  {label}
                </span>

                {/* Hour cells */}
                {HOURS.map(h => {
                  let cellClass: string

                  if (!isAvailDay) {
                    // Day off — gray
                    cellClass = 'bg-border/50'
                  } else if (fromHour !== null && toHour !== null) {
                    cellClass = isWithinRange(h, fromHour, toHour)
                      ? 'bg-status-success'   // available — green
                      : 'bg-status-error/70'  // same day but outside hours — red
                  } else {
                    // Day available but no specific hours set — all green
                    cellClass = 'bg-status-success'
                  }

                  return (
                    <div
                      key={h}
                      title={`${label} ${String(h).padStart(2, '0')}:00`}
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
      <div className="flex flex-wrap gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[3px] bg-status-success" />
          <span className="text-xs text-text-muted">{t('avail_legend_available')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[3px] bg-status-error/70" />
          <span className="text-xs text-text-muted">{t('avail_legend_busy')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[3px] bg-border/50" />
          <span className="text-xs text-text-muted">{t('avail_legend_off')}</span>
        </div>
      </div>

      {/* Timezone */}
      <p className="text-xs text-text-muted/50 mt-2">
        UTC{timezoneOffset >= 0 ? '+' : ''}{timezoneOffset}
      </p>
    </div>
  )
}
