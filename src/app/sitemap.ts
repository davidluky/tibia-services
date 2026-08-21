import type { MetadataRoute } from 'next'
import { createPublicServerClient } from '@/lib/supabase/public'
import { DEMO_PROFILE_ID_FILTER } from '@/lib/demo-profiles'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.APP_URL ?? 'https://tibia.davidluky.com').replace(/\/$/, '')

  // This route is prerendered at build time, so anything thrown here fails the
  // whole deploy. Seller URLs are an enhancement to the sitemap, not the point
  // of it: if Supabase is unreachable or its env vars are missing in this
  // environment, ship the static routes below rather than block the build.
  let serviceiros: Array<{ id: string; created_at: string }> = []
  try {
    // Anon key, not service role: this is the same public listing /browse reads,
    // and it must exclude the seeded demo profiles /browse hides so Google is not
    // handed three fake sellers as indexable inventory.
    const supabase = createPublicServerClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, created_at')
      .eq('role', 'serviceiro')
      .eq('is_banned', false)
      .not('id', 'in', DEMO_PROFILE_ID_FILTER)
    serviceiros = data ?? []
  } catch (error) {
    console.warn('sitemap: listing seller URLs failed, emitting static routes only.', error)
  }

  const serviceiroUrls: MetadataRoute.Sitemap = serviceiros.map(s => ({
    url: `${baseUrl}/serviceiro/${s.id}`,
    lastModified: new Date(s.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/servicos`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/termos`,
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacidade`,
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    ...serviceiroUrls,
  ]
}
