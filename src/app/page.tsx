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

  if (error || !data) return []

  // Get avg ratings and completion counts for each serviceiro
  const results: ServiceiroWithProfile[] = await Promise.all(
    data.map(async (sp) => {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('serviceiro_id', sp.id)
        .eq('is_visible', true)

      const { data: completions } = await supabase
        .from('serviceiro_completion_counts')
        .select('service_type, count')
        .eq('serviceiro_id', sp.id)

      const avg_rating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null

      const completion_counts: Record<string, number> = {}
      completions?.forEach(c => {
        completion_counts[c.service_type] = Number(c.count)
      })

      return {
        ...sp,
        profile: sp.profile as ServiceiroWithProfile['profile'],
        avg_rating,
        review_count: reviews?.length ?? 0,
        completion_counts: completion_counts as Record<GameplayTypeKey, number>,
      }
    })
  )

  return results
}

export default async function HomePage() {
  const featured = await getFeaturedServiceiros()

  return <HomeClient featured={featured} />
}
