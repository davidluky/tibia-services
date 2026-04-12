import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerT } from '@/lib/i18n-server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
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
      <div className="flex items-center gap-4 mb-8 pb-4 border-b border-border">
        <h1 className="text-xl font-bold text-text-primary">{t('admin_title')}</h1>
        <nav className="flex gap-4 text-sm">
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
