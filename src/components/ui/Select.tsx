import { type SelectHTMLAttributes, useId } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({
  label,
  error,
  options,
  className = '',
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = error ? `${selectId}-error` : undefined
  const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm text-text-muted">{label}</label>
      )}
      <select
        id={selectId}
        aria-invalid={error ? true : ariaInvalid}
        aria-describedby={describedBy}
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
      {error && <p id={errorId} className="text-xs text-status-error">{error}</p>}
    </div>
  )
}
