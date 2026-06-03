import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerT } from '@/lib/i18n-server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin | Tibia Services',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const t = await getServerT()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 pb-4 border-b border-border">
        <h1 className="text-xl font-bold text-text-primary">{t('admin_title')}</h1>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href="/admin" className="text-text-muted hover:text-gold transition-colors">{t('admin_nav_home')}</Link>
          <Link href="/admin/verifications" className="text-text-muted hover:text-gold transition-colors">{t('admin_nav_verifications')}</Link>
          <Link href="/admin/users" className="text-text-muted hover:text-gold transition-colors">{t('admin_nav_users')}</Link>
          <Link href="/admin/reviews" className="text-text-muted hover:text-gold transition-colors">{t('admin_nav_reviews')}</Link>
          <Link href="/admin/disputes" className="text-text-muted hover:text-gold transition-colors">{t('admin_nav_disputes')}</Link>
          <Link href="/admin/featured" className="text-text-muted hover:text-gold transition-colors">{t('admin_nav_featured')}</Link>
        </nav>
      </div>
      {children}
    </div>
  )
}
