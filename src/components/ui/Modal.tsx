'use client'
import { useEffect, useId, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  ariaLabel?: string
  children: React.ReactNode
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function Modal({ open, onClose, title, ariaLabel, children }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Move focus into the dialog on open and return it to the trigger on close.
  useEffect(() => {
    if (!open) return

    const trigger = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const first = dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    ;(first ?? dialog)?.focus()

    return () => trigger?.focus()
  }, [open])

  // Close on Escape, and keep Tab inside the dialog aria-modal claims is modal.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      )
      if (focusable.length === 0) {
        e.preventDefault()
        dialogRef.current?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (e.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        e.preventDefault()
        first.focus()
      }
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel ?? 'Dialog'}
        tabIndex={-1}
        className="relative bg-bg-card border border-border rounded-xl w-full max-w-lg p-6 animate-fade-in focus:outline-none"
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
