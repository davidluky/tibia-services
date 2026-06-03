# Pre-Launch Hardening — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the Tibia Services marketplace for public launch with security fixes, performance improvements, SEO, UX polish, real-time messaging, and legal pages.

**Architecture:** 13 independent tasks grouped into 7 chunks. Each chunk is safe to execute in isolation. No task depends on another except where noted (Toast before Loading skeletons; i18n keys before BookingThread fix).

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + Realtime), react-hot-toast (new), Tailwind CSS.

---

## Chunk 1: Critical Fixes

### Task 1: service_requests migration + admin page link bug

**Files:**
- Create: `supabase/migrations/004-service-requests.sql`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/004-service-requests.sql`:

```sql
-- service_requests table (for customer-posted job requests)
-- Use IF NOT EXISTS — table may already exist if schema was applied manually

CREATE TABLE IF NOT EXISTS service_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type    TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  flexible_time   BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_date  DATE,
  preferred_time  TIME,
  budget_tc       INTEGER,
  status          TEXT NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_customer ON service_requests (customer_id);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can read open requests
CREATE POLICY IF NOT EXISTS "service_requests_public_read" ON service_requests
  FOR SELECT USING (status = 'open');

-- Customers can insert their own
CREATE POLICY IF NOT EXISTS "service_requests_own_insert" ON service_requests
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Customers can update (close) their own
CREATE POLICY IF NOT EXISTS "service_requests_own_update" ON service_requests
  FOR UPDATE USING (auth.uid() = customer_id);
```

- [ ] **Step 2: Fix admin page link bug in `src/app/admin/page.tsx`**

Read the file. Find the stats array entry that has `label: 'Reservas ativas'` and `href: '/admin/verifications'` (wrong link). Change its href to `'/admin/disputes'`:

```typescript
  { label: 'Reservas ativas', value: activeBookings ?? 0, href: '/admin/disputes' },
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add supabase/migrations/004-service-requests.sql src/app/admin/page.tsx && git commit -m "fix: add service_requests migration and fix admin page link"
```

---

## Chunk 2: Input Sanitization

### Task 2: Server-side HTML stripping on all user text inputs

**Files:**
- Modify: `src/lib/utils.ts` (add `sanitizeText` helper)
- Modify: `src/app/api/service-requests/route.ts`
- Modify: `src/app/api/bookings/route.ts` (booking creation)
- Modify: `src/app/api/reviews/route.ts`
- Modify: `src/app/api/disputes/route.ts`
- Modify: `src/app/dashboard/route.ts` OR the Supabase client update in `DashboardClient.tsx` — actually sanitize on the profile update API if one exists, or inline in the dashboard save. Check `src/app/api/profile/route.ts` or similar.

**Note:** First read `src/lib/utils.ts` and all the API routes listed. If a profile update API route exists, add sanitization there. If display_name/bio are updated directly via Supabase client in DashboardClient, add a `sanitizeText` call before the update call.

- [ ] **Step 1: Add `sanitizeText` to `src/lib/utils.ts`**

Read the current `src/lib/utils.ts`. Add this function (after existing exports):

```typescript
/**
 * Strips HTML tags from user input to prevent stored XSS.
 * Call on any user-provided text before storing in the database.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')   // strip HTML tags
    .replace(/javascript:/gi, '') // strip JS protocol
    .trim()
}
```

- [ ] **Step 2: Apply to `src/app/api/service-requests/route.ts`**

Read the file. Import `sanitizeText` from `@/lib/utils`. Find where title and description are used before insert. Wrap them:

```typescript
import { isValidTC, sanitizeText } from '@/lib/utils'
```

In the insert, change:
```typescript
      title: title.trim(),
      description: description && typeof description === 'string' ? description.trim() || null : null,
```
To:
```typescript
      title: sanitizeText(title),
      description: description && typeof description === 'string' ? sanitizeText(description) || null : null,
```

- [ ] **Step 3: Apply to `src/app/api/reviews/route.ts`**

Read the file. Find where `comment` is inserted. Add sanitization:
```typescript
import { sanitizeText } from '@/lib/utils'
// ...
comment: comment ? sanitizeText(comment) : null,
```

- [ ] **Step 4: Apply to `src/app/api/disputes/route.ts`**

Read the file. Find where `reason` is inserted. Add sanitization:
```typescript
import { sanitizeText } from '@/lib/utils'
// ...
reason: sanitizeText(reason),
```

- [ ] **Step 5: Apply to profile/display_name/bio updates**

Read `src/app/dashboard/DashboardClient.tsx`. Find the `handleSave` function where it calls `supabase.from('profiles').update({...})`. Add sanitization inline (this is a client component, so import sanitizeText directly):

```typescript
import { sanitizeText } from '@/lib/utils'
// in handleSave:
    const profileRes = await supabase.from('profiles').update({
      display_name: sanitizeText(displayName),
      bio: bio ? sanitizeText(bio) : null,
      whatsapp: whatsapp || null,
      discord: discord || null,
    }).eq('id', userId)
```

**Note:** whatsapp/discord don't need HTML stripping (they're handles, not free text), but sanitizing them is harmless. Skip them to avoid over-engineering.

- [ ] **Step 6: Apply to messages**

Read `src/components/booking/BookingThread.tsx`. Find the `sendMessage` function where message content is POSTed. Find the POST API route it calls (likely `/api/bookings/[id]/messages` or similar). Read that route and add sanitization to the message content before insert.

If messages are sent via a Supabase client insert directly in BookingThread, sanitize inline before insert:
```typescript
import { sanitizeText } from '@/lib/utils'
// before insert:
const cleanContent = sanitizeText(newMessage)
if (!cleanContent) return
// use cleanContent in the insert
```

- [ ] **Step 7: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 8: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/lib/utils.ts src/app/api/service-requests/route.ts src/app/api/reviews/route.ts src/app/api/disputes/route.ts src/app/dashboard/DashboardClient.tsx src/components/booking/BookingThread.tsx && git commit -m "security: strip HTML from all user-generated text inputs"
```

---

## Chunk 3: Performance — Fix N+1 Queries on Browse Page

### Task 3: Batch reviews and completion counts in getAllServiceiros

**Files:**
- Modify: `src/app/browse/page.tsx`

Currently `getAllServiceiros()` fires 2 DB queries per serviceiro (reviews + completion_counts). Replace with 3 total queries: one for all serviceiros, one for all relevant reviews, one for all completion counts.

- [ ] **Step 1: Rewrite `getAllServiceiros` in `src/app/browse/page.tsx`**

Read the current file. Replace the entire `getAllServiceiros` function with this optimized version:

```typescript
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
      featured_until: null, // will be populated below
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/app/browse/page.tsx && git commit -m "perf: batch reviews and completion count queries in browse page (N+1 fix)"
```

---

## Chunk 4: URL-Persistent Search Filters

### Task 4: Persist browse filters in URL searchParams

**Files:**
- Modify: `src/app/browse/page.tsx` (read searchParams, pass to client)
- Modify: `src/app/browse/BrowseClient.tsx` (use router to update URL on filter change)

- [ ] **Step 1: Update `src/app/browse/page.tsx`**

Add `searchParams` prop to `BrowsePage` and pass parsed initial filters to `BrowseClient`:

```typescript
interface BrowsePageProps {
  searchParams: {
    search?: string
    vocations?: string
    gameplay_types?: string
    weekdays?: string
    registered_only?: string
  }
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
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
```

- [ ] **Step 2: Update `src/app/browse/BrowseClient.tsx`**

Add `useRouter`, `useSearchParams`, `useCallback`. Accept `initialFilters` prop. Sync filter state to URL on every change.

Replace the entire file content with:

```typescript
'use client'
import { useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ServiceiroFilters, type Filters } from '@/components/serviceiro/ServiceiroFilters'
import { ServiceiroCard } from '@/components/serviceiro/ServiceiroCard'
import type { ServiceiroWithProfile } from '@/lib/types'
import { useLanguage } from '@/lib/language-context'

function applyFilters(serviceiros: ServiceiroWithProfile[], filters: Filters): ServiceiroWithProfile[] {
  return serviceiros.filter(s => {
    if (filters.registered_only && !s.is_registered) return false

    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!(s.profile.display_name ?? '').toLowerCase().includes(q)) return false
    }

    const vocations     = s.vocations ?? []
    const gameplayTypes = s.gameplay_types ?? []
    const weekdays      = s.available_weekdays ?? []

    if (filters.vocations.length > 0) {
      if (!filters.vocations.some(v => vocations.includes(v as never))) return false
    }
    if (filters.gameplay_types.length > 0) {
      if (!filters.gameplay_types.some(g => gameplayTypes.includes(g as never))) return false
    }
    if (filters.weekdays.length > 0) {
      if (!filters.weekdays.some(d => weekdays.includes(d as never))) return false
    }

    return true
  })
}

interface BrowseClientProps {
  serviceiros: ServiceiroWithProfile[]
  initialFilters: Filters
}

export function BrowseClient({ serviceiros, initialFilters }: BrowseClientProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters)

    const params = new URLSearchParams()
    if (newFilters.search) params.set('search', newFilters.search)
    if (newFilters.vocations.length > 0) params.set('vocations', newFilters.vocations.join(','))
    if (newFilters.gameplay_types.length > 0) params.set('gameplay_types', newFilters.gameplay_types.join(','))
    if (newFilters.weekdays.length > 0) params.set('weekdays', newFilters.weekdays.join(','))
    if (newFilters.registered_only) params.set('registered_only', 'true')

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router])

  const filtered = applyFilters(serviceiros, filters)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-1">{t('browse_title')}</h1>
        <p className="text-text-muted text-sm">{filtered.length} {filtered.length !== 1 ? t('browse_result_count_plural') : t('browse_result_count_singular')}</p>
      </div>

      <button
        className="md:hidden mb-4 flex items-center gap-2 text-sm text-text-muted border border-border rounded-md px-4 py-2 hover:border-gold/50 transition-colors"
        onClick={() => setFiltersOpen(!filtersOpen)}
      >
        ⚙ {t('browse_filters_btn')} {filtersOpen ? '▲' : '▼'}
      </button>

      <div className="flex gap-8">
        <div className={`${filtersOpen ? 'block' : 'hidden'} md:block w-full md:w-64 shrink-0`}>
          <ServiceiroFilters filters={filters} onChange={handleFilterChange} />
        </div>

        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <p className="text-4xl mb-4">⚔</p>
              <p className="text-lg font-medium text-text-primary mb-2">{t('browse_empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(s => (
                <ServiceiroCard
                  key={s.id}
                  serviceiro={s}
                  isFeatured={s.featured_until !== null && new Date(s.featured_until) > new Date()}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/app/browse/page.tsx src/app/browse/BrowseClient.tsx && git commit -m "feat: persist browse filters in URL searchParams"
```

---

## Chunk 5: SEO + Discovery

### Task 5: Dynamic metadata on serviceiro profile pages + robots.txt + sitemap

**Files:**
- Modify: `src/app/serviceiro/[id]/page.tsx` (add `generateMetadata`)
- Create: `public/robots.txt`
- Create: `src/app/sitemap.ts`

- [ ] **Step 1: Add `generateMetadata` to serviceiro profile page**

Read `src/app/serviceiro/[id]/page.tsx`. Add this function BEFORE the `export default async function ServiceiroProfilePage` declaration:

```typescript
export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, bio')
    .eq('id', params.id)
    .eq('role', 'serviceiro')
    .single()

  if (!profile) return {}

  const title = `${profile.display_name} — Tibia Services`
  const description = profile.bio
    ? profile.bio.slice(0, 155)
    : `Contrate ${profile.display_name} para hunts, quests e mais no Tibia.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  }
}
```

- [ ] **Step 2: Create `public/robots.txt`**

```
User-agent: *
Allow: /
Allow: /browse
Allow: /servicos
Allow: /serviceiro/

Disallow: /dashboard
Disallow: /admin
Disallow: /bookings
Disallow: /auth

Sitemap: https://tibiaservices.com.br/sitemap.xml
```

**Note:** Replace `tibiaservices.com.br` with the actual production domain if different.

- [ ] **Step 3: Create `src/app/sitemap.ts`**

```typescript
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
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/servicos`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/termos`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacidade`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...serviceiroUrls,
  ]
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add "src/app/serviceiro/[id]/page.tsx" public/robots.txt src/app/sitemap.ts && git commit -m "feat: add dynamic SEO metadata, robots.txt, and sitemap"
```

---

## Chunk 6: Toast Notifications + Loading Skeletons

### Task 6: Install react-hot-toast and add toasts to key actions

**Files:**
- Modify: `package.json` (install react-hot-toast)
- Modify: `src/app/layout.tsx` (add Toaster)
- Modify: `src/app/dashboard/DashboardClient.tsx` (toast on save)
- Modify: `src/components/serviceiro/FeaturedListingCard.tsx` (toast on actions)

- [ ] **Step 1: Install react-hot-toast**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npm install react-hot-toast
```

- [ ] **Step 2: Add `<Toaster>` to `src/app/layout.tsx`**

Read the file. Add import and Toaster component:

```typescript
import { Toaster } from 'react-hot-toast'
```

Inside the `<body>` (after `<Providers>` opening tag or as first child inside main):
```tsx
        <Providers>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              },
            }}
          />
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
```

- [ ] **Step 3: Add toast to dashboard save in `src/app/dashboard/DashboardClient.tsx`**

Read the file. Add import:
```typescript
import toast from 'react-hot-toast'
```

Find the `handleSave` function. Find where `setSaved(true)` is called on success. Replace with:
```typescript
      toast.success(t('dashboard_saved') ?? 'Perfil salvo!')
```

Find where `setError(t('dashboard_save_error'))` is called. Also add:
```typescript
      toast.error(t('dashboard_save_error') ?? 'Erro ao salvar.')
```

Keep the existing `setSaved`/`setError` calls if they're used elsewhere in the UI; adding toast is additive.

- [ ] **Step 4: Add toasts to `src/components/serviceiro/FeaturedListingCard.tsx`**

Read the file. Add import:
```typescript
import toast from 'react-hot-toast'
```

In `handleSubmit`, after `fetchListing()` on success, add:
```typescript
      toast.success('Pedido criado! Envie os TCs para Cursos Senai.')
```

In `handleCancel`, after `setListing(null)` on success, add:
```typescript
      toast.success('Pedido cancelado.')
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/app/layout.tsx src/app/dashboard/DashboardClient.tsx src/components/serviceiro/FeaturedListingCard.tsx package.json package-lock.json && git commit -m "feat: add react-hot-toast notifications to key actions"
```

---

### Task 7: Loading skeletons for admin pages

**Files:**
- Create: `src/components/ui/Skeleton.tsx`
- Create: `src/app/admin/loading.tsx`

- [ ] **Step 1: Create `src/components/ui/Skeleton.tsx`**

```typescript
import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-border/50 rounded-md',
        className
      )}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="border border-border rounded-xl p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/admin/loading.tsx`**

```typescript
import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border rounded-xl p-5 space-y-2">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/components/ui/Skeleton.tsx src/app/admin/loading.tsx && git commit -m "feat: add loading skeletons for admin panel"
```

---

## Chunk 7: Real-Time Messaging

### Task 8: Replace polling with Supabase Realtime in BookingThread

**Files:**
- Modify: `src/components/booking/BookingThread.tsx`

Currently BookingThread polls every 30 seconds. Replace the `setInterval` with a Supabase Realtime subscription on `messages` filtered by `booking_id`.

- [ ] **Step 1: Read `src/components/booking/BookingThread.tsx` in full**

Before making changes, read the entire file to understand:
- Where `setInterval` is (the polling logic)
- How `supabase` client is created inside the component
- The `messages` state and how messages are appended

- [ ] **Step 2: Replace polling with Realtime subscription**

Find the `useEffect` that sets up the polling interval (it calls `fetchMessages` every 30000ms). Replace it with:

```typescript
  // Initial fetch + Realtime subscription (replaces 30s polling)
  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel(`booking-messages-${booking.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${booking.id}`,
        },
        (payload) => {
          // Append new message if it's not already in the list
          setMessages(prev => {
            if (prev.some(m => m.id === (payload.new as { id: string }).id)) return prev
            return [...prev, payload.new as Message]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id])
```

**Important:** Keep the existing `fetchMessages` function unchanged. Only replace the `useEffect` that does polling.

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit 2>&1
```

Expected: no output. If there are type errors on `payload.new`, cast it: `payload.new as unknown as Message`.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/components/booking/BookingThread.tsx && git commit -m "feat: replace polling with Supabase Realtime in BookingThread"
```

---

## Chunk 8: i18n Fixes + Legal Pages + Timezone

### Task 9: Fix hardcoded Portuguese strings in BookingThread

**Files:**
- Modify: `src/lib/i18n.ts` (add 6 new keys)
- Modify: `src/components/booking/BookingThread.tsx` (use t())

- [ ] **Step 1: Add new keys to `src/lib/i18n.ts`**

Read the file. Add to all three locales (pt, en, es).

**pt** (after last existing key in pt block):
```typescript
    booking_disputed_title: 'Esta reserva está em disputa',
    booking_disputed_reason: 'Motivo:',
    booking_disputed_opened_by: 'Aberta por',
    booking_disputed_waiting: 'Aguardando resolução do admin.',
    booking_resolved_title: 'Disputa resolvida',
    booking_participant_fallback: 'participante',
```

**en** (after last existing key in en block):
```typescript
    booking_disputed_title: 'This booking is under dispute',
    booking_disputed_reason: 'Reason:',
    booking_disputed_opened_by: 'Opened by',
    booking_disputed_waiting: 'Waiting for admin resolution.',
    booking_resolved_title: 'Dispute resolved',
    booking_participant_fallback: 'participant',
```

**es** (after last existing key in es block):
```typescript
    booking_disputed_title: 'Esta reserva está en disputa',
    booking_disputed_reason: 'Motivo:',
    booking_disputed_opened_by: 'Abierta por',
    booking_disputed_waiting: 'Esperando resolución del admin.',
    booking_resolved_title: 'Disputa resuelta',
    booking_participant_fallback: 'participante',
```

- [ ] **Step 2: Update hardcoded strings in `src/components/booking/BookingThread.tsx`**

Read the file. Find the disputed state card (around line 220):
```tsx
            <h3 className="text-sm font-semibold text-status-warning mb-2">Esta reserva está em disputa</h3>
            <p className="text-sm text-text-primary mb-1">
              <span className="text-text-muted">Motivo: </span>{dispute.reason}
            </p>
            <p className="text-xs text-text-muted">
              Aberta por <span className="text-text-primary">{dispute.opener?.display_name ?? 'participante'}</span>
            </p>
            <p className="text-xs text-text-muted mt-2">Aguardando resolução do admin.</p>
```

Replace with:
```tsx
            <h3 className="text-sm font-semibold text-status-warning mb-2">{t('booking_disputed_title')}</h3>
            <p className="text-sm text-text-primary mb-1">
              <span className="text-text-muted">{t('booking_disputed_reason')} </span>{dispute.reason}
            </p>
            <p className="text-xs text-text-muted">
              {t('booking_disputed_opened_by')} <span className="text-text-primary">{dispute.opener?.display_name ?? t('booking_participant_fallback')}</span>
            </p>
            <p className="text-xs text-text-muted mt-2">{t('booking_disputed_waiting')}</p>
```

Find the resolved state card:
```tsx
            <h3 className="text-sm font-semibold text-text-muted mb-2">Disputa resolvida</h3>
```

Replace with:
```tsx
            <h3 className="text-sm font-semibold text-text-muted mb-2">{t('booking_resolved_title')}</h3>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/lib/i18n.ts src/components/booking/BookingThread.tsx && git commit -m "i18n: replace hardcoded Portuguese strings in BookingThread"
```

---

### Task 10: Legal pages (Terms + Privacy) + Footer links

**Files:**
- Create: `src/app/termos/page.tsx`
- Create: `src/app/privacidade/page.tsx`
- Modify: `src/components/layout/Footer.tsx` (add links)

- [ ] **Step 1: Create `src/app/termos/page.tsx`**

```typescript
export const metadata = {
  title: 'Termos de Uso — Tibia Services',
}

export default function TermosPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-8">Termos de Uso</h1>

      <div className="prose prose-sm text-text-muted space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">1. Aceitação dos Termos</h2>
          <p>Ao acessar e usar o Tibia Services, você concorda com estes Termos de Uso. Se não concordar, não utilize a plataforma.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">2. Descrição do Serviço</h2>
          <p>O Tibia Services é uma plataforma que conecta jogadores de Tibia que oferecem serviços (serviceiros) com clientes que desejam contratar esses serviços. A plataforma atua apenas como intermediária e não se responsabiliza pelas transações realizadas.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">3. Responsabilidades do Usuário</h2>
          <p>O usuário é responsável por manter a confidencialidade de sua conta, fornecer informações verídicas, e cumprir os acordos feitos com outros usuários. É proibido usar a plataforma para atividades ilegais, fraudes, ou violações dos Termos de Serviço do jogo Tibia.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">4. Pagamentos</h2>
          <p>Os pagamentos entre clientes e serviceiros são realizados em Tibia Coins (moeda do jogo) e são de responsabilidade exclusiva das partes envolvidas. O Tibia Services não processa pagamentos em dinheiro real e não se responsabiliza por disputas relacionadas a pagamentos.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">5. Condutas Proibidas</h2>
          <p>É proibido: criar perfis falsos, realizar spam, assediar outros usuários, publicar conteúdo ofensivo ou ilegal, ou tentar manipular o sistema de avaliações.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">6. Moderação e Banimentos</h2>
          <p>A plataforma reserva-se o direito de remover conteúdo e banir usuários que violem estes termos, sem aviso prévio.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">7. Alterações nos Termos</h2>
          <p>Estes termos podem ser alterados a qualquer momento. O uso contínuo da plataforma após as alterações constitui aceitação dos novos termos.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">8. Contato</h2>
          <p>Para dúvidas sobre estes termos, entre em contato através das redes sociais da plataforma.</p>
        </section>

        <p className="text-xs text-text-muted/60 pt-4">Última atualização: março de 2026</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/privacidade/page.tsx`**

```typescript
export const metadata = {
  title: 'Política de Privacidade — Tibia Services',
}

export default function PrivacidadePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-8">Política de Privacidade</h1>

      <div className="prose prose-sm text-text-muted space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">1. Dados Coletados</h2>
          <p>Coletamos: endereço de e-mail (para autenticação), nome de exibição, bio, informações de disponibilidade, e dados de uso da plataforma (reservas, avaliações, mensagens).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">2. Uso dos Dados</h2>
          <p>Seus dados são usados para: operar a plataforma, exibir seu perfil para outros usuários, enviar notificações relacionadas às suas reservas, e melhorar o serviço.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">3. Compartilhamento de Dados</h2>
          <p>Não vendemos seus dados. Suas informações de contato (WhatsApp, Discord) são visíveis apenas para usuários logados que as solicitarem. Seus dados são armazenados no Supabase (infraestrutura em nuvem segura).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">4. Seus Direitos (LGPD)</h2>
          <p>De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a: acessar seus dados, corrigir dados incorretos, solicitar a exclusão de sua conta e dados, e revogar seu consentimento. Para exercer esses direitos, entre em contato conosco.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">5. Cookies</h2>
          <p>Utilizamos cookies essenciais para autenticação (gerenciados pelo Supabase). Não utilizamos cookies de rastreamento ou publicidade.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">6. Segurança</h2>
          <p>Adotamos medidas de segurança técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito (HTTPS) e controle de acesso baseado em roles (RLS).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">7. Retenção de Dados</h2>
          <p>Seus dados são mantidos enquanto sua conta estiver ativa. Ao excluir sua conta, seus dados pessoais são removidos, exceto registros necessários para obrigações legais.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">8. Contato</h2>
          <p>Para questões de privacidade ou para exercer seus direitos, entre em contato através das redes sociais da plataforma.</p>
        </section>

        <p className="text-xs text-text-muted/60 pt-4">Última atualização: março de 2026</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add links to `src/components/layout/Footer.tsx`**

Read the file. Find where footer links are rendered. Add links to /termos and /privacidade. The exact placement depends on the existing footer structure — add them alongside other footer links (or in a new "Legal" section if the footer has sections):

```tsx
<a href="/termos" className="text-text-muted hover:text-gold transition-colors text-sm">Termos de Uso</a>
<a href="/privacidade" className="text-text-muted hover:text-gold transition-colors text-sm">Privacidade</a>
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/app/termos/page.tsx src/app/privacidade/page.tsx src/components/layout/Footer.tsx && git commit -m "feat: add Termos de Uso and Política de Privacidade pages"
```

---

### Task 11: Auto-detect browser timezone in dashboard

**Files:**
- Modify: `src/app/dashboard/DashboardClient.tsx`

Currently timezone defaults to `-3` (hardcoded). Auto-detect from browser on first load for new users.

- [ ] **Step 1: Add timezone auto-detection to `src/app/dashboard/DashboardClient.tsx`**

Read the file. Find the `useEffect`-equivalent initialization or add a new one. Add this after the state declarations (around line 40, after `const [tzOffset, setTzOffset] = useState(...)`):

```typescript
  // Auto-detect browser timezone on first load (only if user hasn't set one yet)
  useEffect(() => {
    if (serviceiroProfile?.timezone_offset === undefined || serviceiroProfile?.timezone_offset === null) {
      try {
        const offsetMinutes = -new Date().getTimezoneOffset()
        const offsetHours = Math.round(offsetMinutes / 60)
        setTzOffset(offsetHours)
      } catch {
        // keep default
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

**Note:** `new Date().getTimezoneOffset()` returns minutes west of UTC (negative for east). Negating it gives UTC+N format. `Math.round` handles half-hour offsets.

This only auto-sets if the serviceiro hasn't already configured their timezone (i.e., it's null/undefined from the DB).

- [ ] **Step 2: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/app/dashboard/DashboardClient.tsx && git commit -m "feat: auto-detect browser timezone in dashboard"
```

---

### Task 12: DB-based rate limiting on critical POST routes

**Files:**
- Modify: `src/app/api/bookings/route.ts` (prevent duplicate booking spam)
- Modify: `src/app/api/disputes/route.ts` (already has UNIQUE constraint, add rate check)
- Modify: `src/app/api/featured/route.ts` (already checks for existing — no change needed)

- [ ] **Step 1: Add booking rate limit in `src/app/api/bookings/route.ts`**

Read the file. After auth/role checks but before the booking insert, add a check that prevents creating more than 3 bookings per minute:

```typescript
  // Rate limit: max 3 booking requests per minute per user
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
  const { count: recentBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', user.id)
    .gt('created_at', oneMinuteAgo)

  if ((recentBookings ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'Muitas solicitações. Aguarde um momento antes de tentar novamente.' },
      { status: 429 }
    )
  }
```

Add this BEFORE the booking insert. Use the `supabase` (user-scoped) client for the count query.

- [ ] **Step 2: Add message rate limit in the messages API route**

Find the messages POST route (check `src/app/api/bookings/[id]/route.ts` or similar for the message sending endpoint). Read it. Add a check that prevents sending more than 10 messages per 10 seconds:

```typescript
  // Rate limit: max 10 messages per 10 seconds per user
  const tenSecondsAgo = new Date(Date.now() - 10 * 1000).toISOString()
  const { count: recentMessages } = await adminClient
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender_id', user.id)
    .gt('created_at', tenSecondsAgo)

  if ((recentMessages ?? 0) >= 10) {
    return NextResponse.json({ error: 'Devagar! Aguarde alguns segundos.' }, { status: 429 })
  }
```

**Note:** If messages are sent via a direct Supabase client insert in the frontend (not via API route), skip this step and note in a code comment that rate limiting should be added when messages move to an API route.

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/app/api/bookings/route.ts && git commit -m "security: add DB-based rate limiting on booking creation"
```
