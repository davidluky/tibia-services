import { type InputHTMLAttributes, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({
  label,
  error,
  className = '',
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm text-text-muted">{label}</label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : ariaInvalid}
        aria-describedby={describedBy}
        className={`
          bg-bg-primary border border-border rounded-md px-3 py-2 text-sm
          text-text-primary placeholder:text-text-muted
          focus:outline-none focus:border-gold transition-colors
          ${error ? 'border-status-error' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p id={errorId} className="text-xs text-status-error">{error}</p>}
    </div>
  )
}
