import { type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm text-text-muted">{label}</label>
      )}
      <select
        className={`
          bg-bg-primary border border-border rounded-md px-3 py-2 text-sm
          text-text-primary focus:outline-none focus:border-gold transition-colors
          ${error ? 'border-status-error' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  )
}
