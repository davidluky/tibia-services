'use client'
import { useState, useCallback, useEffect, useId, useRef } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { timeAgo } from '@/lib/utils'
import type { Notification } from '@/lib/types'

export function NotificationBell() {
  const { t, lang } = useLanguage()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownId = useId()
  const titleId = useId()

  const unreadCount = notifications.filter(n => !n.is_read).length
  const buttonLabel = unreadCount > 0
    ? `${t('notif_bell_label')} (${unreadCount})`
    : t('notif_bell_label')

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: unreadIds }),
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          const willOpen = !open
          setOpen(willOpen)
          if (willOpen && unreadCount > 0) void markAllRead()
        }}
        className="relative text-text-muted hover:text-text-primary transition-colors p-1"
        aria-label={buttonLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dropdownId}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -top-1 -right-1 bg-status-error text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={dropdownId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          <div className="px-4 py-3 border-b border-border">
            <h3 id={titleId} className="text-sm font-semibold text-text-primary">{t('notif_title')}</h3>
          </div>
          {notifications.length === 0 ? (
            <p role="status" className="text-text-muted text-sm px-4 py-6 text-center">{t('notif_empty')}</p>
          ) : (
            <div role="list" className="divide-y divide-border">
              {notifications.map(n => (
                <div key={n.id} role="listitem" className={`px-4 py-3 ${!n.is_read ? 'bg-gold/5' : ''}`}>
                  {n.link ? (
                    <Link href={n.link} className="block" onClick={() => setOpen(false)}>
                      <p className="text-sm text-text-primary font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-text-muted mt-0.5">{n.body}</p>}
                      <time dateTime={n.created_at} className="block text-xs text-text-muted mt-1">{timeAgo(n.created_at, lang)}</time>
                    </Link>
                  ) : (
                    <div>
                      <p className="text-sm text-text-primary font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-text-muted mt-0.5">{n.body}</p>}
                      <time dateTime={n.created_at} className="block text-xs text-text-muted mt-1">{timeAgo(n.created_at, lang)}</time>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
