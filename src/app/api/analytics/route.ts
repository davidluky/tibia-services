import { NextResponse } from 'next/server'
import { getAuthUserWithProfile, unauthorized, forbidden } from '@/lib/api-helpers'

export async function GET() {
  const { user, profile, supabase } = await getAuthUserWithProfile()
  if (!user) return unauthorized()
  if (!profile || profile.role !== 'serviceiro') return forbidden('Serviceiros only')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, service_type, status, agreed_price_tc, created_at, completed_at')
    .eq('serviceiro_id', user.id)

  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, created_at')
    .eq('serviceiro_id', user.id)
    .eq('is_visible', true)
    .order('created_at', { ascending: true })

  const completed = bookings?.filter(b => b.status === 'completed') ?? []
  const totalRevenue = completed.reduce((sum, b) => sum + (b.agreed_price_tc ?? 0), 0)

  const byType: Record<string, number> = {}
  completed.forEach(b => {
    byType[b.service_type] = (byType[b.service_type] ?? 0) + 1
  })

  const monthlyBookings: Record<string, number> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyBookings[key] = 0
  }
  completed.forEach(b => {
    if (!b.completed_at) return
    const key = b.completed_at.slice(0, 7)
    if (key in monthlyBookings) monthlyBookings[key]++
  })

  const monthlyRatings: Record<string, { sum: number; count: number }> = {}
  reviews?.forEach(r => {
    const key = r.created_at.slice(0, 7)
    if (!monthlyRatings[key]) monthlyRatings[key] = { sum: 0, count: 0 }
    monthlyRatings[key].sum += r.rating
    monthlyRatings[key].count++
  })

  const ratingTrend = Object.entries(monthlyRatings).map(([month, { sum, count }]) => ({
    month,
    avg: Math.round((sum / count) * 10) / 10,
  }))

  return NextResponse.json({
    totalCompleted: completed.length,
    totalRevenue,
    totalBookings: bookings?.length ?? 0,
    avgRating: reviews && reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null,
    reviewCount: reviews?.length ?? 0,
    byType,
    monthlyBookings,
    ratingTrend,
  })
}
