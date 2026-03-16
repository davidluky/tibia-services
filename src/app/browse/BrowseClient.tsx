'use client'
import { useState } from 'react'
import { ServiceiroFilters, type Filters } from '@/components/serviceiro/ServiceiroFilters'
import { ServiceiroCard } from '@/components/serviceiro/ServiceiroCard'
import type { ServiceiroWithProfile } from '@/lib/types'
import { useLanguage } from '@/lib/language-context'

const DEFAULT_FILTERS: Filters = {
  vocations: [],
  gameplay_types: [],
  weekdays: [],
  registered_only: false,
  search: '',
}

function applyFilters(serviceiros: ServiceiroWithProfile[], filters: Filters): ServiceiroWithProfile[] {
  return serviceiros.filter(s => {
    if (filters.registered_only && !s.is_registered) return false

    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!(s.profile.display_name ?? '').toLowerCase().includes(q)) return false
    }

    const vocations      = s.vocations ?? []
    const gameplayTypes  = s.gameplay_types ?? []
    const weekdays       = s.available_weekdays ?? []

    if (filters.vocations.length > 0) {
      if (!filters.vocations.some(v => vocations.includes(v as never))) return false
    }

    if (filters.gameplay_types.length > 0) {
      if (!filters.gameplay_types.some(g => gameplayTypes.includes(g as never))) return false
    }

    if (filters.weekdays.length > 0) {
      if (!filters.weekdays.some(d => weekdays.includes(d as never))) return false
    }

    return true
  })
}

interface BrowseClientProps {
  serviceiros: ServiceiroWithProfile[]
}

export function BrowseClient({ serviceiros }: BrowseClientProps) {
  const { t } = useLanguage()
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filtered = applyFilters(serviceiros, filters)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-1">{t('browse_title')}</h1>
        <p className="text-text-muted text-sm">{filtered.length} {filtered.length !== 1 ? t('browse_result_count_plural') : t('browse_result_count_singular')}</p>
      </div>

      {/* Mobile filter toggle */}
      <button
        className="md:hidden mb-4 flex items-center gap-2 text-sm text-text-muted border border-border rounded-md px-4 py-2 hover:border-gold/50 transition-colors"
        onClick={() => setFiltersOpen(!filtersOpen)}
      >
        ⚙ {t('browse_filters_btn')} {filtersOpen ? '▲' : '▼'}
      </button>

      <div className="flex gap-8">
        {/* Filters sidebar */}
        <div className={`${filtersOpen ? 'block' : 'hidden'} md:block w-full md:w-64 shrink-0`}>
          <ServiceiroFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Results grid */}
        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <p className="text-4xl mb-4">⚔</p>
              <p className="text-lg font-medium text-text-primary mb-2">{t('browse_empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(s => (
                <ServiceiroCard
                  key={s.id}
                  serviceiro={s}
                  isFeatured={s.featured_until !== null && new Date(s.featured_until) > new Date()}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
