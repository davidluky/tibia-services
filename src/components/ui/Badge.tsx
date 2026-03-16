// Used to display vocation names and gameplay types as pills

type BadgeVariant = 'vocation' | 'gameplay' | 'registered' | 'status'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
}

const styles: Record<BadgeVariant, string> = {
  vocation:   'bg-gold/10 text-gold border border-gold/20',
  gameplay:   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  registered: 'bg-gold text-bg-primary font-semibold',
  status:     'bg-bg-primary text-text-muted border border-border',
}

export function Badge({ label, variant = 'status' }: BadgeProps) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${styles[variant]}`}>
      {label}
    </span>
  )
}
