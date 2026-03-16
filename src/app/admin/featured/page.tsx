import { createAdminClient } from '@/lib/supabase/admin'
import { FeaturedConfirmForm } from './FeaturedConfirmForm'

function hoursAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (60 * 60 * 1000))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default async function AdminFeaturedPage() {
  const admin = createAdminClient()

  const { data: pending } = await admin
    .from('featured_listings')
    .select('*, serviceiro:profiles!serviceiro_id(display_name)')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  const { data: active } = await admin
    .from('featured_listings')
    .select('*, serviceiro:profiles!serviceiro_id(display_name)')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })

  const TIMEOUT_MS = 24 * 60 * 60 * 1000

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Destaques</h2>

      {/* Pending payments */}
      <section className="mb-10">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Pagamentos pendentes</h3>
        {!pending || pending.length === 0 ? (
          <p className="text-text-muted text-sm">Nenhum pagamento pendente.</p>
        ) : (
          <div className="space-y-4">
            {pending.map((listing) => {
              const timedOut = Date.now() - new Date(listing.requested_at).getTime() > TIMEOUT_MS
              const serviceiro = listing.serviceiro as { display_name: string } | null
              return (
                <div
                  key={listing.id}
                  className={`border rounded-lg p-4 space-y-2 ${timedOut ? 'border-border opacity-50' : 'border-border bg-bg-card'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-text-primary">
                        {serviceiro?.display_name ?? '—'}
                      </p>
                      <p className="text-xs text-text-muted">
                        {listing.tc_amount} TC · {listing.days_requested} dias
                        {' '}· solicitado há {hoursAgo(listing.requested_at)}h
                      </p>
                    </div>
                    {timedOut ? (
                      <span className="text-xs text-text-muted italic shrink-0">Expirado — não pago</span>
                    ) : (
                      <FeaturedConfirmForm listingId={listing.id} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Active featured listings */}
      <section>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Destaques ativos</h3>
        {!active || active.length === 0 ? (
          <p className="text-text-muted text-sm">Nenhum destaque ativo.</p>
        ) : (
          <div className="space-y-3">
            {active.map((listing) => {
              const serviceiro = listing.serviceiro as { display_name: string } | null
              return (
                <div key={listing.id} className="border border-gold/30 bg-gold/5 rounded-lg p-4">
                  <p className="text-sm font-medium text-text-primary">
                    {serviceiro?.display_name ?? '—'}
                  </p>
                  <p className="text-xs text-text-muted">
                    {listing.tc_amount} TC · {listing.days_requested} dias
                    {listing.expires_at && ` · expira em ${formatDate(listing.expires_at)}`}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
