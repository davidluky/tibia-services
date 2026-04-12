import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BrowseClient } from './BrowseClient'
import type { ServiceiroWithProfile } from '@/lib/types'
import type { GameplayTypeKey } from '@/lib/constants'

async function getAllServiceiros(): Promise<ServiceiroWithProfile[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('serviceiro_profiles')
    .select(`
      *,
      profile:profiles!inner(id, role, display_name, bio, is_banned, created_at)
    `)
    .eq('profiles.is_banned', false)

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

  const results: ServiceiroWithProfile[] = data.map(sp => {
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

  // Fetch currently active featured listings
  const adminClient = createAdminClient()
  const { data: featuredRows } = await adminClient
    .from('featured_listings')
    .select('serviceiro_id, expires_at')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())

  const featuredMap = new Map(featuredRows?.map(f => [f.serviceiro_id, f.expires_at as string]) ?? [])

  const enriched = results.map(s => ({
    ...s,
    featured_until: featuredMap.get(s.id) ?? null,
  }))

  const featured = enriched
    .filter(s => s.featured_until !== null)
    .sort((a, b) =>
      (b.avg_rating ?? 0) - (a.avg_rating ?? 0) ||
      new Date(b.profile.created_at).getTime() - new Date(a.profile.created_at).getTime()
    )

  const nonFeatured = enriched
    .filter(s => s.featured_until === null)
    .sort((a, b) => {
      if (a.is_registered !== b.is_registered) return a.is_registered ? -1 : 1
      return (b.avg_rating ?? 0) - (a.avg_rating ?? 0)
    })

  return [...featured, ...nonFeatured]
}

interface BrowsePageProps {
  searchParams: Promise<{
    search?: string
    vocations?: string
    gameplay_types?: string
    weekdays?: string
    registered_only?: string
  }>
}

export default async function BrowsePage(props: BrowsePageProps) {
  const searchParams = await props.searchParams;
  const serviceiros = await getAllServiceiros()

  const initialFilters = {
    search: searchParams.search ?? '',
    vocations: searchParams.vocations ? searchParams.vocations.split(',') : [],
    gameplay_types: searchParams.gameplay_types ? searchParams.gameplay_types.split(',') : [],
    weekdays: searchParams.weekdays ? searchParams.weekdays.split(',') : [],
    registered_only: searchParams.registered_only === 'true',
  }

  return <BrowseClient serviceiros={serviceiros} initialFilters={initialFilters} />
}
