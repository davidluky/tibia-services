'use client'
import { GAMEPLAY_TYPES } from '@/lib/constants'
import { useLanguage } from '@/lib/language-context'

export interface RequestFilters {
  service_types: string[]
  time_preference: 'all' | 'anytime' | 'scheduled'
  budget: 'all' | 'up500' | 'up1000' | 'over1000'
}

export const DEFAULT_REQUEST_FILTERS: RequestFilters = {
  service_types: [],
  time_preference: 'all',
  budget: 'all',
}

interface Props {
  filters: RequestFilters
  onChange: (f: RequestFilters) => void
}

export function ServiceRequestFilters({ filters, onChange }: Props) {
  const { t } = useLanguage()

  const toggleType = (key: string) => {
    const current = filters.service_types
    onChange({
      ...filters,
      service_types: current.includes(key)
        ? current.filter(x => x !== key)
        : [...current, key],
    })
  }

  const hasActiveFilters =
    filters.service_types.length > 0 ||
    filters.time_preference !== 'all' ||
    filters.budget !== 'all'

  return (
    <aside className="flex flex-col gap-6">
      {/* Service type */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          {t('requests_filter_type')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {GAMEPLAY_TYPES.map(g => (
            <button
              key={g.key}
              onClick={() => toggleType(g.key)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors cursor-pointer ${
                filters.service_types.includes(g.key)
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'border-border text-text-muted hover:border-blue-500/30'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time preference */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          {t('requests_filter_time')}
        </h3>
        <div className="flex flex-col gap-1.5">
          {(['all', 'anytime', 'scheduled'] as const).map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="time_preference"
                checked={filters.time_preference === opt}
                onChange={() => onChange({ ...filters, time_preference: opt })}
                className="accent-gold"
              />
              <span className="text-sm text-text-primary">
                {opt === 'all'
                  ? t('filter_all')
                  : opt === 'anytime'
                  ? t('requests_filter_anytime')
                  : t('requests_filter_scheduled')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          {t('requests_filter_budget')}
        </h3>
        <div className="flex flex-col gap-1.5">
          {(['all', 'up500', 'up1000', 'over1000'] as const).map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="budget"
                checked={filters.budget === opt}
                onChange={() => onChange({ ...filters, budget: opt })}
                className="accent-gold"
              />
              <span className="text-sm text-text-primary">
                {opt === 'all'
                  ? t('requests_filter_budget_any')
                  : opt === 'up500'
                  ? t('requests_filter_budget_up500')
                  : opt === 'up1000'
                  ? t('requests_filter_budget_up1000')
                  : t('requests_filter_budget_over1000')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          onClick={() => onChange(DEFAULT_REQUEST_FILTERS)}
          className="text-xs text-text-muted hover:text-status-error transition-colors text-left"
        >
          {t('requests_filter_clear')}
        </button>
      )}
    </aside>
  )
}
