import { type ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary:   'bg-gold text-bg-primary hover:bg-gold-bright font-semibold',
  secondary: 'bg-bg-card border border-border text-text-primary hover:border-gold',
  danger:    'bg-status-error/10 border border-status-error text-status-error hover:bg-status-error/20',
  ghost:     'text-text-muted hover:text-text-primary',
}

const sizes: Record<Size, string> = {
  sm:  'px-3 py-1.5 text-sm rounded',
  md:  'px-4 py-2 text-sm rounded-md',
  lg:  'px-6 py-3 text-base rounded-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'transition-colors inline-flex items-center gap-2 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <span className="animate-spin">⟳</span>}
      {children}
    </button>
  )
}
