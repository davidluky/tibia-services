'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useLanguage } from '@/lib/language-context'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { NotificationBell } from './NotificationBell'

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()
  const { t } = useLanguage()

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="border-b border-border bg-bg-card sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-gold font-bold text-xl tracking-wide hover:text-gold-bright transition-colors">
          ⚔ Tibia Services
        </Link>

        {/* Desktop Nav links */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/browse" className="text-text-muted hover:text-text-primary transition-colors text-sm">
            {t('nav_browse')}
          </Link>

          {user ? (
            <>
              <Link href="/dashboard" className="text-gold hover:text-gold-bright text-sm font-medium transition-colors" title={t('nav_dashboard')}>
                {user.user_metadata?.display_name ?? user.email}
              </Link>
              <Link href="/bookings" className="text-text-muted hover:text-text-primary transition-colors text-sm">
                {t('nav_bookings')}
              </Link>
              <NotificationBell />
              <Link href="/dashboard" className="text-text-muted hover:text-text-primary transition-colors text-sm">
                {t('nav_dashboard')}
              </Link>
              <button
                onClick={handleLogout}
                className="text-text-muted hover:text-status-error transition-colors text-sm"
              >
                {t('nav_logout')}
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-text-muted hover:text-text-primary transition-colors text-sm">
                {t('nav_login')}
              </Link>
              <Link
                href="/auth/register"
                className="bg-gold text-bg-primary px-4 py-2 rounded-md text-sm font-semibold hover:bg-gold-bright transition-colors"
              >
                {t('nav_register')}
              </Link>
            </>
          )}
          <span className="border-l border-border pl-4">
            <LanguageSwitcher />
          </span>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-text-muted hover:text-text-primary p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-bg-card px-4 py-4 flex flex-col gap-4">
          <Link href="/browse" className="text-text-muted hover:text-text-primary text-sm" onClick={() => setMenuOpen(false)}>
            {t('nav_browse')}
          </Link>
          {user ? (
            <>
              <Link href="/bookings" className="text-text-muted hover:text-text-primary text-sm" onClick={() => setMenuOpen(false)}>
                {t('nav_bookings')}
              </Link>
              <NotificationBell />
              <Link href="/dashboard" className="text-text-muted hover:text-text-primary text-sm" onClick={() => setMenuOpen(false)}>
                {t('nav_dashboard')}
              </Link>
              <button onClick={handleLogout} className="text-text-muted hover:text-status-error text-sm text-left">
                {t('nav_logout')}
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-text-muted hover:text-text-primary text-sm" onClick={() => setMenuOpen(false)}>
                {t('nav_login')}
              </Link>
              <Link href="/auth/register" className="bg-gold text-bg-primary px-4 py-2 rounded-md text-sm font-semibold hover:bg-gold-bright transition-colors inline-block text-center" onClick={() => setMenuOpen(false)}>
                {t('nav_register')}
              </Link>
            </>
          )}
          <div className="border-t border-border pt-3">
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </nav>
  )
}
