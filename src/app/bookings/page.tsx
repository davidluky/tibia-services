import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { QuestIcon } from '@/components/ui/icons'
import { GAMEPLAY_TYPES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { getServerT } from '@/lib/i18n-server'
import type { Booking } from '@/lib/types'
import type { Metadata } from 'next'

type BookingListRow = Pick<
  Booking,
  'id' | 'customer_id' | 'serviceiro_id' | 'service_type' | 'status' | 'created_at'
> & {
  customer: { display_name: string } | null
  serviceiro: { display_name: string } | null
}

export const metadata: Metadata = {
  title: 'Minhas Reservas | Tibia Services',
  robots: {
    index: false,
    follow: false,
  },
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  active: 'Ativa',
  completed: 'Concluída',
  declined: 'Recusada',
  cancelled: 'Cancelada',
  disputed: 'Disputada',
  resolved: 'Resolvida',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-status-warning',
  active: 'text-status-success',
  completed: 'text-gold',
  declined: 'text-status-error',
  cancelled: 'text-text-muted',
  disputed: 'text-status-warning',
  resolved: 'text-text-muted',
}

export default async function BookingsPage() {
  const supabase = await createClient()
  const t = await getServerT()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      serviceiro_id,
      service_type,
      status,
      created_at,
      customer:profiles!customer_id(display_name),
      serviceiro:profiles!serviceiro_id(display_name)
    `)
    .or(`customer_id.eq.${user.id},serviceiro_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .overrideTypes<BookingListRow[], { merge: false }>()

  const groups = {
    active: (bookings ?? []).filter(b => b.status === 'active'),
    pending: (bookings ?? []).filter(b => b.status === 'pending'),
    completed: (bookings ?? []).filter(b => ['completed', 'declined', 'cancelled', 'disputed', 'resolved'].includes(b.status)),
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-text-primary mb-8">Minhas Reservas</h1>

      {(bookings?.length ?? 0) === 0 ? (
        <EmptyState
          icon={QuestIcon}
          title={t('bookings_empty_title')}
          description={t('bookings_empty_desc')}
          action={(
            <Link href="/browse" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-bg-primary transition-colors hover:bg-gold-bright">
              {t('bookings_empty_cta')}
            </Link>
          )}
        />
      ) : (
        <div className="space-y-8">
          {groups.active.length > 0 && (
            <BookingGroup title="Ativas" bookings={groups.active} currentUserId={user.id} />
          )}
          {groups.pending.length > 0 && (
            <BookingGroup title="Pendentes" bookings={groups.pending} currentUserId={user.id} />
          )}
          {groups.completed.length > 0 && (
            <BookingGroup title="Histórico" bookings={groups.completed} currentUserId={user.id} />
          )}
        </div>
      )}
    </div>
  )
}

function BookingGroup({ title, bookings, currentUserId }: {
  title: string
  bookings: BookingListRow[]
  currentUserId: string
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-3">{title}</h2>
      <div className="space-y-2">
        {bookings.map(booking => {
          const isCustomer = currentUserId === booking.customer_id
          const otherParty = isCustomer ? booking.serviceiro : booking.customer
          const serviceType = GAMEPLAY_TYPES.find(g => g.key === booking.service_type)

          return (
            <Link key={booking.id} href={`/bookings/${booking.id}`}>
              <Card className="p-4 hover:bg-bg-hover transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">
                      {serviceType?.label ?? booking.service_type}
                      {' '}—{' '}
                      <span className="text-text-muted font-normal">
                        {isCustomer ? `Serviceiro: ${otherParty?.display_name}` : `Cliente: ${otherParty?.display_name}`}
                      </span>
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">{formatDate(booking.created_at)}</p>
                  </div>
                  <span className={`text-sm font-medium ${STATUS_COLORS[booking.status]}`}>
                    {STATUS_LABELS[booking.status]}
                  </span>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
