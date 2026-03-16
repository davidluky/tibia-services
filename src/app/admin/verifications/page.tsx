import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'

export default async function VerificationsPage() {
  const admin = createAdminClient()

  const { data: requests } = await admin
    .from('verification_requests')
    .select('*, serviceiro:profiles!serviceiro_id(display_name)')
    .order('submitted_at', { ascending: false })

  const STATUS_COLORS: Record<string, string> = {
    pending: 'text-status-warning',
    approved: 'text-status-success',
    rejected: 'text-status-error',
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Solicitações de verificação</h2>

      {!requests || requests.length === 0 ? (
        <p className="text-text-muted">Nenhuma solicitação.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-left">
                <th className="pb-3 pr-4">Serviceiro</th>
                <th className="pb-3 pr-4">Personagem</th>
                <th className="pb-3 pr-4">Enviado em</th>
                <th className="pb-3 pr-4">Taxa paga</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.map((req: {
                id: string
                serviceiro: { display_name: string } | null
                character_name: string
                submitted_at: string
                fee_paid: boolean
                status: string
              }) => (
                <tr key={req.id} className="hover:bg-bg-card transition-colors">
                  <td className="py-3 pr-4 text-text-primary">{req.serviceiro?.display_name}</td>
                  <td className="py-3 pr-4 text-text-muted">{req.character_name}</td>
                  <td className="py-3 pr-4 text-text-muted">{formatDate(req.submitted_at)}</td>
                  <td className="py-3 pr-4">
                    <span className={req.fee_paid ? 'text-status-success' : 'text-status-warning'}>
                      {req.fee_paid ? '✓ Sim' : '⏳ Não'}
                    </span>
                  </td>
                  <td className={`py-3 pr-4 ${STATUS_COLORS[req.status]}`}>
                    {req.status}
                  </td>
                  <td className="py-3">
                    <Link href={`/admin/verifications/${req.id}`} className="text-gold hover:text-gold-bright text-xs">
                      Ver detalhes →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
