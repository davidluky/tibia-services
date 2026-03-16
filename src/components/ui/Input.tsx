import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm text-text-muted">{label}</label>
      )}
      <input
        className={`
          bg-bg-primary border border-border rounded-md px-3 py-2 text-sm
          text-text-primary placeholder:text-text-muted
          focus:outline-none focus:border-gold transition-colors
          ${error ? 'border-status-error' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  )
}
