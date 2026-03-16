import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

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
        <h1 className="text-xl font-bold text-text-primary">Admin</h1>
        <nav className="flex gap-4 text-sm">
          <a href="/admin" className="text-text-muted hover:text-gold transition-colors">Home</a>
          <a href="/admin/verifications" className="text-text-muted hover:text-gold transition-colors">Verificações</a>
          <a href="/admin/users" className="text-text-muted hover:text-gold transition-colors">Usuários</a>
          <a href="/admin/reviews" className="text-text-muted hover:text-gold transition-colors">Avaliações</a>
        </nav>
      </div>
      {children}
    </div>
  )
}
