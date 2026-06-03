'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { ServiceRequestCard } from '@/components/servicerequest/ServiceRequestCard'
import type { ServiceRequest } from '@/lib/types'
import { ServiceRequestFilters, DEFAULT_REQUEST_FILTERS, type RequestFilters } from '@/components/servicerequest/ServiceRequestFilters'

function applyRequestFilters(requests: ServiceRequest[], filters: RequestFilters): ServiceRequest[] {
  return requests.filter(r => {
    if (filters.service_types.length > 0 && !filters.service_types.includes(r.service_type)) {
      return false
    }

    if (filters.time_preference === 'anytime' && !r.flexible_time) return false
    if (filters.time_preference === 'scheduled' && r.flexible_time) return false

    if (filters.budget !== 'all') {
      const b = r.budget_tc ?? 0
      if (filters.budget === 'up500' && b > 500) return false
      if (filters.budget === 'up1000' && b > 1000) return false
      if (filters.budget === 'over1000' && b <= 1000) return false
    }

    return true
  })
}

interface ServiceRequestsClientProps {
  requests: ServiceRequest[]
  isServiceiro: boolean
  isCustomer: boolean
  isLoggedIn: boolean
  serviceiroGameplayTypes: string[]
}

export function ServiceRequestsClient({ requests, isServiceiro, isCustomer, isLoggedIn, serviceiroGameplayTypes }: ServiceRequestsClientProps) {
  const { t } = useLanguage()
  const [filters, setFilters] = useState<RequestFilters>(DEFAULT_REQUEST_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filtered = applyRequestFilters(requests, filters)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{t('requests_page_title')}</h1>
          <p className="text-text-muted mt-1 text-sm">
            {t('requests_page_subtitle')} · {filtered.length} {t('requests_result_count')}
          </p>
        </div>
        {isCustomer && (
          <Link
            href="/servicos/novo"
            className="shrink-0 bg-gold text-bg-primary px-4 py-2 rounded-md text-sm font-semibold hover:bg-gold-bright transition-colors"
          >
            {t('requests_post_btn')}
          </Link>
        )}
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
          <ServiceRequestFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Results */}
        <div className="flex-1">
          {filtered.length === 0 ? (
            <p className="text-text-muted text-sm py-8">{t('requests_empty')}</p>
          ) : (
            <div className="space-y-4">
              {filtered.map(r => (
                <ServiceRequestCard
                  key={r.id}
                  request={r}
                  isServiceiro={isServiceiro}
                  isLoggedIn={isLoggedIn}
                  isMatch={serviceiroGameplayTypes.includes(r.service_type)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
