import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminPage() {
  const admin = createAdminClient()

  const [
    { count: pendingVerifs },
    { count: activeBookings },
    { count: totalUsers },
    { count: totalReviews },
  ] = await Promise.all([
    admin.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('reviews').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Verificações pendentes', value: pendingVerifs ?? 0, href: '/admin/verifications', urgent: (pendingVerifs ?? 0) > 0 },
    { label: 'Reservas ativas', value: activeBookings ?? 0, href: '/admin/disputes' },
    { label: 'Total de usuários', value: totalUsers ?? 0, href: '/admin/users' },
    { label: 'Total de avaliações', value: totalReviews ?? 0, href: '/admin/reviews' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Visão geral</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href}>
            <div className={`bg-bg-card border rounded-xl p-5 cursor-pointer hover:border-gold/50 transition-colors ${
              stat.urgent ? 'border-status-warning/50' : 'border-border'
            }`}>
              <p className={`text-3xl font-bold mb-1 ${stat.urgent ? 'text-status-warning' : 'text-text-primary'}`}>
                {stat.value}
              </p>
              <p className="text-text-muted text-sm">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
