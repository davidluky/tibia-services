import { createClient } from '@/lib/supabase/server'
import { HomeClient } from './HomeClient'
import type { ServiceiroWithProfile } from '@/lib/types'
import type { GameplayTypeKey } from '@/lib/constants'

async function getFeaturedServiceiros(): Promise<ServiceiroWithProfile[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('serviceiro_profiles')
    .select(`
      *,
      profile:profiles!inner(id, role, display_name, bio, is_banned, created_at)
    `)
    .eq('is_registered', true)
    .eq('profiles.is_banned', false)
    .limit(6)

  if (error || !data || data.length === 0) return []

  const ids = data.map(sp => sp.id)

  // Batch: one query for all reviews, one for all completion counts
  const [{ data: allReviews }, { data: allCompletions }] = await Promise.all([
    supabase
      .from('reviews')
      .select('serviceiro_id, rating')
      .in('serviceiro_id', ids)
      .eq('is_visible', true),
    supabase
      .from('serviceiro_completion_counts')
      .select('serviceiro_id, service_type, count')
      .in('serviceiro_id', ids),
  ])

  // Build lookup maps
  const reviewMap = new Map<string, number[]>()
  allReviews?.forEach(r => {
    const list = reviewMap.get(r.serviceiro_id) ?? []
    list.push(r.rating)
    reviewMap.set(r.serviceiro_id, list)
  })

  const completionMap = new Map<string, Record<string, number>>()
  allCompletions?.forEach(c => {
    const map = completionMap.get(c.serviceiro_id) ?? {}
    map[c.service_type] = Number(c.count)
    completionMap.set(c.serviceiro_id, map)
  })

  return data.map(sp => {
    const ratings = reviewMap.get(sp.id) ?? []
    const avg_rating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : null

    return {
      ...sp,
      profile: sp.profile as ServiceiroWithProfile['profile'],
      avg_rating,
      review_count: ratings.length,
      completion_counts: (completionMap.get(sp.id) ?? {}) as Record<GameplayTypeKey, number>,
      featured_until: null,
    }
  })
}

export default async function HomePage() {
  const featured = await getFeaturedServiceiros()

  return <HomeClient featured={featured} />
}
