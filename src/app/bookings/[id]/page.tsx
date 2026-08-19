import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookingThread } from '@/components/booking/BookingThread'
import { ReviewForm } from '@/components/review/ReviewForm'
import type { Booking, Dispute, PublicProfile } from '@/lib/types'

type BookingDetailRow = Omit<Booking, 'customer' | 'serviceiro'> & {
  customer: PublicProfile | null
  serviceiro: PublicProfile | null
}

type DisputeDetailRow = Dispute & {
  opener: { display_name: string } | null
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BookingDetailPage(props: PageProps) {
  const params = await props.params;
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Fetch booking with joined profiles
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      serviceiro_id,
      service_type,
      agreed_price_tc,
      price_confirmed_by_customer,
      price_confirmed_by_serviceiro,
      payment_sent_by_customer,
      payment_received_by_serviceiro,
      complete_by_customer,
      complete_by_serviceiro,
      status,
      created_at,
      completed_at,
      customer:profiles!customer_id(id, display_name, role, bio, is_banned, created_at),
      serviceiro:profiles!serviceiro_id(id, display_name, role, bio, is_banned, created_at)
    `)
    .eq('id', params.id)
    .single()
    .overrideTypes<BookingDetailRow, { merge: false }>()

  if (!booking) notFound()

  // Verify user is a participant
  if (booking.customer_id !== user.id && booking.serviceiro_id !== user.id) {
    notFound()
  }

  // Check if review already exists (only customer can review)
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', params.id)
    .single()

  // Fetch dispute if booking is disputed or resolved
  const { data: dispute } = booking.status === 'disputed' || booking.status === 'resolved'
    ? await supabase
        .from('disputes')
        .select('id, booking_id, opened_by, reason, status, resolution, resolved_by, opened_at, resolved_at, opener:profiles!opened_by(display_name)')
        .eq('booking_id', params.id)
        .single()
        .overrideTypes<DisputeDetailRow, { merge: false }>()
    : { data: null }

  const canReview =
    booking.status === 'completed' &&
    booking.customer_id === user.id &&
    !existingReview

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <BookingThread
        booking={booking}
        currentUserId={user.id}
        currentUserRole={profile?.role ?? 'customer'}
        dispute={dispute ?? undefined}
      />

      {canReview && (
        <div className="mt-8 max-w-lg">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Avaliar Serviceiro</h2>
          <ReviewForm bookingId={params.id} serviceiroId={booking.serviceiro_id} />
        </div>
      )}
    </div>
  )
}
