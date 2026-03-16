import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { DisputeResolveForm } from './DisputeResolveForm'

export default async function AdminDisputesPage() {
  const admin = createAdminClient()

  const { data: disputes } = await admin
    .from('disputes')
    .select(`
      *,
      booking:bookings(id, service_type, customer_id, serviceiro_id),
      opener:profiles!opened_by(display_name)
    `)
    .eq('status', 'open')
    .order('opened_at', { ascending: true })
    .limit(50)

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Disputas abertas</h2>

      {!disputes || disputes.length === 0 ? (
        <p className="text-text-muted">Nenhuma disputa aberta.</p>
      ) : (
        <div className="space-y-6">
          {disputes.map((dispute) => (
            <div key={dispute.id} className="border border-border rounded-lg p-5 bg-bg-card space-y-3">
              <div className="space-y-1">
                <p className="text-sm text-text-primary font-medium">
                  Aberta por{' '}
                  <span className="text-gold">
                    {(dispute.opener as { display_name: string } | null)?.display_name ?? '—'}
                  </span>
                </p>
                {dispute.booking && (
                  <p className="text-xs text-text-muted">
                    Reserva:{' '}
                    <Link
                      href={`/bookings/${(dispute.booking as { id: string }).id}`}
                      className="text-gold hover:text-gold-bright underline"
                    >
                      {(dispute.booking as { id: string }).id.slice(0, 8)}…
                    </Link>
                    {' '}· Serviço:{' '}
                    <span className="text-text-primary">
                      {(dispute.booking as { service_type: string }).service_type}
                    </span>
                  </p>
                )}
                <p className="text-sm text-text-primary mt-2">{dispute.reason}</p>
              </div>
              <DisputeResolveForm disputeId={dispute.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
