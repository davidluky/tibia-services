'use client'
import { useEffect, useId } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  ariaLabel?: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, ariaLabel, children }: ModalProps) {
  const titleId = useId()

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel ?? 'Dialog'}
        className="relative bg-bg-card border border-border rounded-xl w-full max-w-lg p-6 animate-fade-in"
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 id={titleId} className="text-lg font-semibold text-text-primary">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
