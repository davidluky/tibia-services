'use client'
import { useLanguage } from '@/lib/language-context'
import { memberSince } from '@/lib/utils'
import { GAMEPLAY_TYPES } from '@/lib/constants'
import { Card } from '@/components/ui/Card'

interface Props {
  completionCounts: Record<string, number>
  avgRating: number | null
  reviewCount: number
  totalCompleted: number
  memberSinceDate: string
}

export function ServiceiroStats({ completionCounts, avgRating, reviewCount, totalCompleted, memberSinceDate }: Props) {
  const { t, lang } = useLanguage()

  if (totalCompleted === 0 && reviewCount === 0) return null

  const activeTypes = GAMEPLAY_TYPES.filter(g => (completionCounts[g.key] ?? 0) > 0)

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
        {t('stats_title')}
      </h2>

      {/* 2×2 stat grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-bg-primary rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gold">{totalCompleted}</p>
          <p className="text-xs text-text-muted mt-0.5">{t('stats_completed')}</p>
        </div>
        <div className="bg-bg-primary rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gold">
            {avgRating !== null ? `${avgRating.toFixed(1)} ★` : '—'}
          </p>
          <p className="text-xs text-text-muted mt-0.5">{t('stats_avg_rating')}</p>
        </div>
        <div className="bg-bg-primary rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gold">{reviewCount}</p>
          <p className="text-xs text-text-muted mt-0.5">{t('stats_reviews')}</p>
        </div>
        <div className="bg-bg-primary rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-gold leading-tight">
            {memberSince(memberSinceDate, lang)}
          </p>
          <p className="text-xs text-text-muted mt-0.5">{t('stats_member_since')}</p>
        </div>
      </div>

      {/* Per-type breakdown */}
      {activeTypes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            {t('stats_by_type')}
          </p>
          <div className="space-y-1.5">
            {activeTypes.map(g => (
              <div key={g.key} className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{g.label}</span>
                <span className="text-gold font-medium">
                  {completionCounts[g.key]} {t('stats_completed_each')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
