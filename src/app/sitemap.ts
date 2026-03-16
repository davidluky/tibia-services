import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tibiaservices.com.br'

  const admin = createAdminClient()
  const { data: serviceiros } = await admin
    .from('profiles')
    .select('id, created_at')
    .eq('role', 'serviceiro')
    .eq('is_banned', false)

  const serviceiroUrls: MetadataRoute.Sitemap = (serviceiros ?? []).map(s => ({
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
