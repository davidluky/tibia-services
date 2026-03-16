'use client'
// 'use client' is required for useLanguage() hook access.
import { useLanguage } from '@/lib/language-context'
import { memberSince } from '@/lib/utils'

interface Props {
  totalCompleted: number
  memberSinceDate: string  // profile.created_at ISO string
}

export function ServiceiroSummaryLine({ totalCompleted, memberSinceDate }: Props) {
  const { t, lang } = useLanguage()

  return (
    <p className="text-text-muted text-xs mt-1">
      {totalCompleted} {t('stats_completed')} · {t('stats_member_for')} {memberSince(memberSinceDate, lang)}
    </p>
  )
}
