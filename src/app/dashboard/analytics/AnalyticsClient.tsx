'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { useLanguage } from '@/lib/language-context'
import { Skeleton } from '@/components/ui/Skeleton'
import { GAMEPLAY_TYPES } from '@/lib/constants'

interface AnalyticsData {
  totalCompleted: number
  totalRevenue: number
  totalBookings: number
  avgRating: number | null
  reviewCount: number
  byType: Record<string, number>
  monthlyBookings: Record<string, number>
  ratingTrend: { month: string; avg: number }[]
}

export function AnalyticsClient() {
  const { t } = useLanguage()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!data) return null

  const maxMonthly = Math.max(...Object.values(data.monthlyBookings), 1)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-text-primary">{t('analytics_title')}</h1>
        <Link href="/dashboard" className="text-gold hover:text-gold-bright text-sm">
          {t('analytics_back')}
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gold">{data.totalCompleted}</p>
          <p className="text-xs text-text-muted">{t('analytics_completed')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gold">{data.totalRevenue.toLocaleString('pt-BR')} TC</p>
          <p className="text-xs text-text-muted">{t('analytics_revenue')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gold">{data.avgRating ?? '\u2014'}</p>
          <p className="text-xs text-text-muted">{t('analytics_avg_rating')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gold">{data.reviewCount}</p>
          <p className="text-xs text-text-muted">{t('analytics_reviews')}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold text-text-primary mb-4">{t('analytics_monthly')}</h2>
        <div className="flex items-end gap-2 h-40">
          {Object.entries(data.monthlyBookings).map(([month, count]) => (
            <div key={month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-text-muted">{count}</span>
              <div
                className="w-full bg-gold/80 rounded-t-sm transition-all"
                style={{ height: `${(count / maxMonthly) * 100}%`, minHeight: count > 0 ? '4px' : '0px' }}
              />
              <span className="text-[10px] text-text-muted">{month.slice(5)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-text-primary mb-4">{t('analytics_by_type')}</h2>
        <div className="space-y-3">
          {GAMEPLAY_TYPES.map(g => {
            const count = data.byType[g.key] ?? 0
            const max = Math.max(...Object.values(data.byType), 1)
            return (
              <div key={g.key} className="flex items-center gap-3">
                <span className="text-sm text-text-muted w-20 shrink-0">{g.label}</span>
                <div className="flex-1 bg-border/30 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gold/70 h-full rounded-full transition-all"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-text-primary font-medium w-8 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
