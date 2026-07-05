import type { ComponentType, ReactNode } from 'react'
import type { FantasyIconProps } from '@/components/ui/icons'

interface EmptyStateProps {
  icon: ComponentType<FantasyIconProps>
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`
        flex flex-col items-center justify-center rounded-xl border border-border bg-bg-card/50 text-center
        ${compact ? 'px-4 py-6' : 'px-6 py-10'}
      `}
    >
      <div className={`${compact ? 'h-9 w-9' : 'h-12 w-12'} mb-4 flex items-center justify-center rounded-lg border border-gold/20 bg-bg-primary text-gold`}>
        <Icon className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
      </div>
      <p className={`${compact ? 'text-sm' : 'text-lg'} font-semibold text-text-primary`}>
        {title}
      </p>
      {description && (
        <p className={`${compact ? 'text-xs' : 'text-sm'} mt-2 max-w-md text-text-muted`}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
