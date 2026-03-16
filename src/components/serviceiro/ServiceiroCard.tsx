'use client'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Stars } from '@/components/ui/Stars'
import { VOCATIONS, GAMEPLAY_TYPES } from '@/lib/constants'
import type { ServiceiroWithProfile } from '@/lib/types'
import { useLanguage } from '@/lib/language-context'

interface ServiceiroCardProps {
  serviceiro: ServiceiroWithProfile
  isFeatured?: boolean
}

export function ServiceiroCard({ serviceiro, isFeatured }: ServiceiroCardProps) {
  const { t } = useLanguage()
  const { profile } = serviceiro

  return (
    <Link href={`/serviceiro/${profile.id}`}>
      <Card
        gold={isFeatured || serviceiro.is_registered}
        className={`p-5 cursor-pointer animate-fade-in hover:translate-y-[-2px] transition-all${isFeatured ? ' shadow-gold/20 shadow-md' : ''}`}
      >
        {/* Featured badge */}
        {isFeatured && (
          <p className="text-xs text-gold font-semibold mb-2">⭐ Destacado</p>
        )}

        {/* Header: name + registered badge */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-text-primary">{profile.display_name}</h3>
            {serviceiro.avg_rating !== null && (
              <div className="flex items-center gap-2 mt-1">
                <Stars rating={serviceiro.avg_rating} />
                <span className="text-xs text-text-muted">
                  {serviceiro.avg_rating.toFixed(1)} ({serviceiro.review_count})
                </span>
              </div>
            )}
          </div>
          {serviceiro.is_registered && (
            <Badge label={t('card_registered_badge')} variant="registered" />
          )}
        </div>

        {/* Bio snippet */}
        {profile.bio && (
          <p className="text-sm text-text-muted mb-3 line-clamp-2">{profile.bio}</p>
        )}

        {/* Vocations */}
        {serviceiro.vocations.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {serviceiro.vocations.map(v => {
              const voc = VOCATIONS.find(x => x.key === v)
              return voc ? <Badge key={v} label={voc.label} variant="vocation" /> : null
            })}
          </div>
        )}

        {/* Gameplay types + completion counts */}
        {serviceiro.gameplay_types.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {serviceiro.gameplay_types.map(g => {
              const gp = GAMEPLAY_TYPES.find(x => x.key === g)
              const count = serviceiro.completion_counts[g as keyof typeof serviceiro.completion_counts] ?? 0
              return gp ? (
                <Badge key={g} label={`${gp.label}${count > 0 ? ` ×${count}` : ''}`} variant="gameplay" />
              ) : null
            })}
          </div>
        )}

        {/* Available weekdays */}
        <div className="flex gap-1 mt-auto pt-2 border-t border-border">
          {['mon','tue','wed','thu','fri','sat','sun'].map(day => (
            <span
              key={day}
              className={`text-xs px-1.5 py-0.5 rounded ${
                serviceiro.available_weekdays.includes(day as never)
                  ? 'bg-gold/10 text-gold'
                  : 'text-text-muted/30'
              }`}
            >
              {t(`avail_${day}` as Parameters<typeof t>[0])}
            </span>
          ))}
        </div>
      </Card>
    </Link>
  )
}
