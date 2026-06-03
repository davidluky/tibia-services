'use client'
import { VOCATIONS, GAMEPLAY_TYPES, WEEKDAYS } from '@/lib/constants'
import { useLanguage } from '@/lib/language-context'

export interface Filters {
  vocations: string[]
  gameplay_types: string[]
  weekdays: string[]
  registered_only: boolean
  search: string
}

interface FiltersProps {
  filters: Filters
  onChange: (filters: Filters) => void
}

export function ServiceiroFilters({ filters, onChange }: FiltersProps) {
  const { t } = useLanguage()

  const toggle = (field: 'vocations' | 'gameplay_types' | 'weekdays', key: string) => {
    const current = filters[field]
    const updated = current.includes(key)
      ? current.filter(x => x !== key)
      : [...current, key]
    onChange({ ...filters, [field]: updated })
  }

  return (
    <aside className="flex flex-col gap-6">
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder={t('filter_search_placeholder')}
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors"
        />
      </div>

      {/* Registered only */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.registered_only}
          onChange={e => onChange({ ...filters, registered_only: e.target.checked })}
          className="accent-gold"
        />
        <span className="text-sm text-text-primary">{t('browse_registered_only')} ✓</span>
      </label>

      {/* Vocations */}
      <FilterGroup
        title={t('filter_vocation_label')}
        items={VOCATIONS.map(v => ({ key: v.key, label: v.label }))}
        selected={filters.vocations}
        onToggle={key => toggle('vocations', key)}
        activeStyle="bg-gold/10 text-gold border-gold/30"
      />

      {/* Gameplay types */}
      <FilterGroup
        title={t('filter_gameplay_label')}
        items={GAMEPLAY_TYPES.map(g => ({ key: g.key, label: g.label }))}
        selected={filters.gameplay_types}
        onToggle={key => toggle('gameplay_types', key)}
        activeStyle="bg-blue-500/10 text-blue-400 border-blue-500/30"
      />

      {/* Weekdays */}
      <FilterGroup
        title={t('filter_weekday_label')}
        items={WEEKDAYS.map(w => ({ key: w.key, label: w.label }))}
        selected={filters.weekdays}
        onToggle={key => toggle('weekdays', key)}
        activeStyle="bg-gold/10 text-gold border-gold/30"
      />
    </aside>
  )
}

function FilterGroup({
  title, items, selected, onToggle, activeStyle,
}: {
  title: string
  items: { key: string; label: string }[]
  selected: string[]
  onToggle: (key: string) => void
  activeStyle: string
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => onToggle(item.key)}
            className={`
              px-3 py-1 rounded-full text-xs border transition-colors cursor-pointer
              ${selected.includes(item.key)
                ? activeStyle
                : 'border-border text-text-muted hover:border-gold/30'
              }
            `}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
