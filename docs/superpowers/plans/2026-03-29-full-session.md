# Tibia Services — Full Session Plan (2026-03-29)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix bugs, add pagination, localize remaining strings, standardize API patterns, add error states, build notification system, analytics dashboard, service request matching, and core test suite.

**Architecture:** Five execution waves. Wave 1 fixes bugs (no file overlap — parallel). Wave 2 adds architecture improvements (parallel). Wave 3 adds new features (parallel, independent pages). Wave 4 adds service request matching. Wave 5 adds the test suite.

**Tech Stack:** Next.js 14, TypeScript, Supabase, Tailwind CSS, Jest + React Testing Library

---

## File Map

### Wave 1 — Quick Fixes (parallel, no file overlap)
| Task | Creates | Modifies |
|------|---------|----------|
| 1. Homepage N+1 | — | `src/app/page.tsx` |
| 2. Remove window.location.reload() | — | `src/components/booking/BookingThread.tsx`, `src/app/admin/disputes/DisputeResolveForm.tsx`, `src/app/admin/featured/FeaturedConfirmForm.tsx` |
| 3. i18n hardcoded strings | — | `src/lib/i18n.ts`, `src/app/dashboard/DashboardClient.tsx`, `src/components/booking/BookingThread.tsx` (dispute section only), `src/app/admin/disputes/DisputeResolveForm.tsx`, `src/app/admin/featured/FeaturedConfirmForm.tsx` |

**NOTE on Tasks 2 & 3:** Both touch `BookingThread.tsx`, `DisputeResolveForm.tsx`, and `FeaturedConfirmForm.tsx`. These MUST run sequentially (Task 2 first, then Task 3) OR be combined into a single agent.

### Wave 2 — Architecture (parallel)
| Task | Creates | Modifies |
|------|---------|----------|
| 4. API middleware | `src/lib/api-helpers.ts` | `src/app/api/bookings/route.ts`, `src/app/api/reviews/route.ts`, `src/app/api/messages/route.ts`, `src/app/api/disputes/route.ts`, `src/app/api/featured/route.ts`, `src/app/api/featured/[id]/route.ts`, `src/app/api/service-requests/route.ts`, `src/app/api/verification/route.ts`, `src/app/api/contact/[id]/route.ts`, `src/app/api/admin/ban/[id]/route.ts`, `src/app/api/admin/disputes/[id]/route.ts`, `src/app/api/admin/featured/[id]/route.ts`, `src/app/api/admin/review/[id]/route.ts`, `src/app/api/admin/verify/[id]/route.ts` |
| 5. Admin pagination | — | `src/app/admin/reviews/page.tsx`, `src/app/admin/verifications/page.tsx`, `src/app/admin/disputes/page.tsx` |

### Wave 3 — New Features (parallel, independent)
| Task | Creates | Modifies |
|------|---------|----------|
| 6. Error boundaries & retry | `src/components/ui/ErrorRetry.tsx` | `src/components/booking/BookingThread.tsx`, `src/components/serviceiro/CharacterVerificationCard.tsx` |
| 7. Notification system | `supabase/migrations/005-notifications.sql`, `src/app/api/notifications/route.ts`, `src/components/layout/NotificationBell.tsx`, `docs/MIGRATION-STEPS.md` | `src/lib/types.ts`, `src/lib/i18n.ts`, `src/components/layout/Navbar.tsx`, `src/app/api/bookings/[id]/route.ts` |
| 8. Analytics dashboard | `src/app/dashboard/analytics/page.tsx`, `src/app/dashboard/analytics/AnalyticsClient.tsx`, `src/app/api/analytics/route.ts` | `src/lib/i18n.ts`, `src/app/dashboard/DashboardClient.tsx` (add link) |

### Wave 4 — Enhancement
| Task | Creates | Modifies |
|------|---------|----------|
| 9. Service request matching | — | `src/app/servicos/page.tsx`, `src/components/servicerequest/ServiceRequestCard.tsx`, `src/components/servicerequest/ServiceRequestFilters.tsx`, `src/lib/i18n.ts` |

### Wave 5 — Testing
| Task | Creates | Modifies |
|------|---------|----------|
| 10. Core test suite | `jest.config.ts`, `jest.setup.ts`, `src/__tests__/utils.test.ts`, `src/__tests__/api-helpers.test.ts`, `src/__tests__/constants.test.ts` | `package.json`, `tsconfig.json` |

---

## Task 1: Fix Homepage N+1 Query

**Files:**
- Modify: `src/app/page.tsx`

The homepage fetches 6 featured serviceiros, then fires 2 queries per serviceiro (12 extra round-trips). The browse page already uses a batched pattern — apply the same here.

- [ ] **Step 1: Replace the N+1 pattern with batch queries**

Replace the entire `getFeaturedServiceiros()` function in `src/app/page.tsx`:

```typescript
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "perf: batch reviews and completion queries on homepage (N+1 fix)"
```

---

## Task 2: Remove window.location.reload() calls

**Files:**
- Modify: `src/components/booking/BookingThread.tsx`
- Modify: `src/app/admin/disputes/DisputeResolveForm.tsx`
- Modify: `src/app/admin/featured/FeaturedConfirmForm.tsx`

Replace hard page reloads with state-based refetching or Next.js router refresh.

- [ ] **Step 1: Fix BookingThread.tsx — replace reload with fetchBooking()**

In `src/components/booking/BookingThread.tsx`, replace the `submitDispute` function's success branch (line 153-154):

Old:
```typescript
    if (res.ok) {
      window.location.reload()
    } else {
```

New:
```typescript
    if (res.ok) {
      setShowDisputeForm(false)
      setDisputeReason('')
      await fetchBooking()
      setDisputeLoading(false)
    } else {
```

- [ ] **Step 2: Fix DisputeResolveForm.tsx — use Next.js router.refresh()**

Replace the entire `DisputeResolveForm.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface DisputeResolveFormProps {
  disputeId: string
}

export function DisputeResolveForm({ disputeId }: DisputeResolveFormProps) {
  const router = useRouter()
  const [resolution, setResolution] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleResolve = async () => {
    if (resolution.length < 10 || resolution.length > 500) {
      setError('A resolução deve ter entre 10 e 500 caracteres.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      })

      let data: { error?: string } = {}
      try {
        data = await res.json()
      } catch {
        // non-JSON response
      }
      if (!res.ok) {
        setError(data.error ?? 'Erro ao resolver disputa.')
      } else {
        router.refresh()
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <label className="text-xs text-text-muted block">Resolução do admin</label>
      <textarea
        value={resolution}
        onChange={e => setResolution(e.target.value)}
        placeholder="Descreva a decisão (10–500 caracteres)"
        rows={3}
        maxLength={500}
        className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold resize-none"
      />
      <p className="text-xs text-text-muted text-right">{resolution.length}/500</p>
      {error && <p className="text-status-error text-xs">{error}</p>}
      <Button
        size="sm"
        onClick={handleResolve}
        loading={loading}
      >
        Resolver
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Fix FeaturedConfirmForm.tsx — use Next.js router.refresh()**

Replace the entire `FeaturedConfirmForm.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface FeaturedConfirmFormProps {
  listingId: string
}

export function FeaturedConfirmForm({ listingId }: FeaturedConfirmFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/featured/${listingId}`, { method: 'PATCH' })
      let data: { error?: string } = {}
      try {
        data = await res.json()
      } catch {
        // non-JSON response
      }
      if (!res.ok) {
        setError(data.error ?? 'Erro ao confirmar.')
      } else {
        router.refresh()
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="shrink-0">
      {error && <p className="text-status-error text-xs mb-1">{error}</p>}
      <Button size="sm" onClick={handleConfirm} loading={loading}>
        Confirmar pagamento
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/booking/BookingThread.tsx src/app/admin/disputes/DisputeResolveForm.tsx src/app/admin/featured/FeaturedConfirmForm.tsx
git commit -m "fix: replace window.location.reload() with router.refresh() and state refetch"
```

---

## Task 3: Fix Hardcoded Portuguese Strings

**Files:**
- Modify: `src/lib/i18n.ts`
- Modify: `src/app/dashboard/DashboardClient.tsx`
- Modify: `src/components/booking/BookingThread.tsx`
- Modify: `src/app/admin/disputes/DisputeResolveForm.tsx`
- Modify: `src/app/admin/featured/FeaturedConfirmForm.tsx`

Add i18n keys for all remaining hardcoded strings. This includes dispute form labels, error messages, and toast messages.

- [ ] **Step 1: Add new i18n keys to all three locales in `src/lib/i18n.ts`**

Add these keys to the `pt` section (after `booking_participant_fallback`):

```typescript
    // Dispute form (BookingThread)
    booking_dispute_btn: 'Abrir Disputa',
    booking_dispute_title: 'Abrir Disputa',
    booking_dispute_placeholder: 'Descreva o motivo da disputa (10\u2013500 caracteres)',
    booking_dispute_confirm: 'Confirmar Disputa',
    booking_dispute_cancel: 'Cancelar',
    booking_dispute_length_error: 'O motivo deve ter entre 10 e 500 caracteres.',
    booking_dispute_error_fallback: 'Erro ao abrir disputa.',

    // Admin dispute resolve
    admin_dispute_resolution_label: 'Resolu\u00e7\u00e3o do admin',
    admin_dispute_resolution_placeholder: 'Descreva a decis\u00e3o (10\u2013500 caracteres)',
    admin_dispute_length_error: 'A resolu\u00e7\u00e3o deve ter entre 10 e 500 caracteres.',
    admin_dispute_resolve_btn: 'Resolver',
    admin_dispute_resolve_error: 'Erro ao resolver disputa.',
    admin_dispute_connection_error: 'Erro de conex\u00e3o. Tente novamente.',

    // Admin featured confirm
    admin_featured_confirm_btn: 'Confirmar pagamento',
    admin_featured_confirm_error: 'Erro ao confirmar.',
    admin_featured_connection_error: 'Erro de conex\u00e3o. Tente novamente.',

    // Dashboard toast
    dashboard_save_toast_success: 'Perfil salvo com sucesso!',
```

Add these keys to the `en` section (after `booking_participant_fallback`):

```typescript
    booking_dispute_btn: 'Open Dispute',
    booking_dispute_title: 'Open Dispute',
    booking_dispute_placeholder: 'Describe the reason for the dispute (10\u2013500 characters)',
    booking_dispute_confirm: 'Confirm Dispute',
    booking_dispute_cancel: 'Cancel',
    booking_dispute_length_error: 'Reason must be between 10 and 500 characters.',
    booking_dispute_error_fallback: 'Error opening dispute.',
    admin_dispute_resolution_label: 'Admin resolution',
    admin_dispute_resolution_placeholder: 'Describe the decision (10\u2013500 characters)',
    admin_dispute_length_error: 'Resolution must be between 10 and 500 characters.',
    admin_dispute_resolve_btn: 'Resolve',
    admin_dispute_resolve_error: 'Error resolving dispute.',
    admin_dispute_connection_error: 'Connection error. Please try again.',
    admin_featured_confirm_btn: 'Confirm payment',
    admin_featured_confirm_error: 'Error confirming.',
    admin_featured_connection_error: 'Connection error. Please try again.',
    dashboard_save_toast_success: 'Profile saved successfully!',
```

Add these keys to the `es` section (after the last existing key):

```typescript
    booking_dispute_btn: 'Abrir Disputa',
    booking_dispute_title: 'Abrir Disputa',
    booking_dispute_placeholder: 'Describe el motivo de la disputa (10\u2013500 caracteres)',
    booking_dispute_confirm: 'Confirmar Disputa',
    booking_dispute_cancel: 'Cancelar',
    booking_dispute_length_error: 'El motivo debe tener entre 10 y 500 caracteres.',
    booking_dispute_error_fallback: 'Error al abrir disputa.',
    admin_dispute_resolution_label: 'Resoluci\u00f3n del admin',
    admin_dispute_resolution_placeholder: 'Describe la decisi\u00f3n (10\u2013500 caracteres)',
    admin_dispute_length_error: 'La resoluci\u00f3n debe tener entre 10 y 500 caracteres.',
    admin_dispute_resolve_btn: 'Resolver',
    admin_dispute_resolve_error: 'Error al resolver disputa.',
    admin_dispute_connection_error: 'Error de conexi\u00f3n. Int\u00e9ntalo de nuevo.',
    admin_featured_confirm_btn: 'Confirmar pago',
    admin_featured_confirm_error: 'Error al confirmar.',
    admin_featured_connection_error: 'Error de conexi\u00f3n. Int\u00e9ntalo de nuevo.',
    dashboard_save_toast_success: '\u00a1Perfil guardado con \u00e9xito!',
```

- [ ] **Step 2: Update DashboardClient.tsx — replace hardcoded toast**

In `src/app/dashboard/DashboardClient.tsx`, replace lines 96-99:

Old:
```typescript
      toast.error(t('dashboard_save_error') ?? 'Erro ao salvar.')
    } else {
      setSaved(true)
      toast.success('Perfil salvo com sucesso!')
```

New:
```typescript
      toast.error(t('dashboard_save_error'))
    } else {
      setSaved(true)
      toast.success(t('dashboard_save_toast_success'))
```

- [ ] **Step 3: Update BookingThread.tsx — replace hardcoded dispute strings**

In `src/components/booking/BookingThread.tsx`, replace the dispute validation error (line 141):

Old:
```typescript
      setDisputeError('O motivo deve ter entre 10 e 500 caracteres.')
```
New:
```typescript
      setDisputeError(t('booking_dispute_length_error'))
```

Replace the dispute error fallback (line 156):
Old:
```typescript
      setDisputeError(data.error ?? 'Erro ao abrir disputa.')
```
New:
```typescript
      setDisputeError(data.error ?? t('booking_dispute_error_fallback'))
```

Replace the hardcoded button text "Abrir Disputa" (line 441):
Old:
```typescript
                Abrir Disputa
```
New:
```typescript
                {t('booking_dispute_btn')}
```

Replace the hardcoded heading "Abrir Disputa" (line 444):
Old:
```typescript
                <h3 className="text-sm font-semibold text-status-warning">Abrir Disputa</h3>
```
New:
```typescript
                <h3 className="text-sm font-semibold text-status-warning">{t('booking_dispute_title')}</h3>
```

Replace the hardcoded placeholder (line 448):
Old:
```typescript
                  placeholder="Descreva o motivo da disputa (10–500 caracteres)"
```
New:
```typescript
                  placeholder={t('booking_dispute_placeholder')}
```

Replace "Confirmar Disputa" (line 466):
Old:
```typescript
                    Confirmar Disputa
```
New:
```typescript
                    {t('booking_dispute_confirm')}
```

Replace "Cancelar" (line 472):
Old:
```typescript
                    Cancelar
```
New:
```typescript
                    {t('booking_dispute_cancel')}
```

- [ ] **Step 4: Update DisputeResolveForm.tsx — replace hardcoded admin strings**

Add the `useLanguage` import and hook to `DisputeResolveForm.tsx`. Replace all hardcoded strings:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/language-context'

interface DisputeResolveFormProps {
  disputeId: string
}

export function DisputeResolveForm({ disputeId }: DisputeResolveFormProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [resolution, setResolution] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleResolve = async () => {
    if (resolution.length < 10 || resolution.length > 500) {
      setError(t('admin_dispute_length_error'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      })

      let data: { error?: string } = {}
      try {
        data = await res.json()
      } catch {
        // non-JSON response
      }
      if (!res.ok) {
        setError(data.error ?? t('admin_dispute_resolve_error'))
      } else {
        router.refresh()
      }
    } catch {
      setError(t('admin_dispute_connection_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <label className="text-xs text-text-muted block">{t('admin_dispute_resolution_label')}</label>
      <textarea
        value={resolution}
        onChange={e => setResolution(e.target.value)}
        placeholder={t('admin_dispute_resolution_placeholder')}
        rows={3}
        maxLength={500}
        className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold resize-none"
      />
      <p className="text-xs text-text-muted text-right">{resolution.length}/500</p>
      {error && <p className="text-status-error text-xs">{error}</p>}
      <Button
        size="sm"
        onClick={handleResolve}
        loading={loading}
      >
        {t('admin_dispute_resolve_btn')}
      </Button>
    </div>
  )
}
```

- [ ] **Step 5: Update FeaturedConfirmForm.tsx — replace hardcoded admin strings**

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/language-context'

interface FeaturedConfirmFormProps {
  listingId: string
}

export function FeaturedConfirmForm({ listingId }: FeaturedConfirmFormProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/featured/${listingId}`, { method: 'PATCH' })
      let data: { error?: string } = {}
      try {
        data = await res.json()
      } catch {
        // non-JSON response
      }
      if (!res.ok) {
        setError(data.error ?? t('admin_featured_confirm_error'))
      } else {
        router.refresh()
      }
    } catch {
      setError(t('admin_featured_connection_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="shrink-0">
      {error && <p className="text-status-error text-xs mb-1">{error}</p>}
      <Button size="sm" onClick={handleConfirm} loading={loading}>
        {t('admin_featured_confirm_btn')}
      </Button>
    </div>
  )
}
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/i18n.ts src/app/dashboard/DashboardClient.tsx src/components/booking/BookingThread.tsx src/app/admin/disputes/DisputeResolveForm.tsx src/app/admin/featured/FeaturedConfirmForm.tsx
git commit -m "i18n: replace all hardcoded Portuguese strings with translation keys"
```

---

## Task 4: Standardize API Route Patterns

**Files:**
- Create: `src/lib/api-helpers.ts`
- Modify: All API routes listed in file map

Extract common auth checking, error response format, and rate limiting into reusable helpers.

- [ ] **Step 1: Create `src/lib/api-helpers.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile } from '@/lib/types'

// ─── Standardized error responses ─────────────────────────────────────────────
// All API routes return errors in this format for consistency.

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function unauthorized() {
  return apiError('Unauthorized', 401)
}

export function forbidden(message = 'Forbidden') {
  return apiError(message, 403)
}

export function notFound(message = 'Not found') {
  return apiError(message, 404)
}

export function badRequest(message: string) {
  return apiError(message, 400)
}

export function serverError(message = 'Internal server error') {
  return apiError(message, 500)
}

export function tooManyRequests(message = 'Too many requests') {
  return apiError(message, 429)
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
// Get the current authenticated user, or null.

export async function getAuthUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
}

// Get user + their profile in one call. Returns null profile if not found.
export async function getAuthUserWithProfile() {
  const { user, supabase } = await getAuthUser()
  if (!user) return { user: null, profile: null, supabase }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile: profile as Profile | null, supabase }
}

// Verify the current user is an admin. Returns the admin Supabase client.
export async function requireAdmin() {
  const { user, supabase } = await getAuthUser()
  if (!user) return { authorized: false as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { authorized: false as const }
  }

  const adminClient = createAdminClient()
  return { authorized: true as const, user, adminClient }
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Simple DB-based rate limiting: count recent rows by user in a given table.

export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  table: string,
  userIdColumn: string,
  userId: string,
  windowMs: number,
  maxRequests: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString()
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(userIdColumn, userId)
    .gt('created_at', since)

  return (count ?? 0) >= maxRequests
}
```

- [ ] **Step 2: Refactor `src/app/api/bookings/route.ts` to use helpers**

```typescript
import { NextRequest } from 'next/server'
import { GAMEPLAY_TYPES } from '@/lib/constants'
import { sendBookingCreated } from '@/lib/email'
import {
  getAuthUserWithProfile,
  unauthorized,
  forbidden,
  badRequest,
  notFound,
  serverError,
  tooManyRequests,
  checkRateLimit,
} from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  const { user, profile, supabase } = await getAuthUserWithProfile()
  if (!user) return unauthorized()

  const body = await request.json()
  const { serviceiro_id, service_type } = body

  if (!serviceiro_id || !service_type) return badRequest('Missing required fields')

  const validTypes = GAMEPLAY_TYPES.map(g => g.key)
  if (!validTypes.includes(service_type)) return badRequest('Invalid service type')

  if (user.id === serviceiro_id) return badRequest('Cannot book yourself')

  if (!profile || profile.role !== 'customer') return forbidden('Only customers can create bookings')

  // Verify serviceiro exists
  const { data: serviceiro } = await supabase
    .from('profiles')
    .select('id, role, is_banned')
    .eq('id', serviceiro_id)
    .eq('role', 'serviceiro')
    .single()

  if (!serviceiro || serviceiro.is_banned) return notFound('Serviceiro not found')

  // Rate limit: max 3 booking requests per minute
  const rateLimited = await checkRateLimit(supabase, 'bookings', 'customer_id', user.id, 60_000, 3)
  if (rateLimited) return tooManyRequests()

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      customer_id: user.id,
      serviceiro_id,
      service_type,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) return serverError('Error creating booking')

  void sendBookingCreated({
    bookingId: booking.id,
    serviceiroId: serviceiro_id,
    customerName: profile.display_name ?? 'Cliente',
    serviceType: service_type,
  })

  return Response.json({ id: booking.id }, { status: 201 })
}
```

- [ ] **Step 3: Refactor `src/app/api/reviews/route.ts` to use helpers**

```typescript
import { NextRequest } from 'next/server'
import { sanitizeText } from '@/lib/utils'
import { getAuthUser, unauthorized, badRequest, notFound, serverError } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  const body = await request.json()
  const { booking_id, serviceiro_id, rating, comment } = body

  if (!booking_id || !serviceiro_id || !rating) return badRequest('Missing required fields')
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return badRequest('Rating must be 1-5')
  if (comment && (typeof comment !== 'string' || comment.length > 1000)) return badRequest('Invalid comment')

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, customer_id, serviceiro_id')
    .eq('id', booking_id)
    .single()

  if (!booking) return notFound('Booking not found')
  if (booking.status !== 'completed') return badRequest('Only completed bookings can be reviewed')
  if (booking.customer_id !== user.id) return badRequest('Only the customer can review')
  if (booking.serviceiro_id !== serviceiro_id) return badRequest('Invalid serviceiro')

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      booking_id,
      reviewer_id: user.id,
      serviceiro_id,
      rating,
      comment: comment ? sanitizeText(comment as string) : null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return badRequest('Already reviewed')
    return serverError('Error creating review')
  }

  return Response.json({ id: review.id }, { status: 201 })
}
```

- [ ] **Step 4: Refactor remaining API routes**

Apply the same pattern to all other API routes. For each:
1. Import helpers from `@/lib/api-helpers`
2. Replace `NextResponse.json({ error: '...' }, { status: N })` with the appropriate helper
3. Replace inline auth checks with `getAuthUser()` / `getAuthUserWithProfile()` / `requireAdmin()`

Routes to update (same pattern as above):
- `src/app/api/messages/route.ts`
- `src/app/api/disputes/route.ts`
- `src/app/api/featured/route.ts`
- `src/app/api/featured/[id]/route.ts`
- `src/app/api/service-requests/route.ts`
- `src/app/api/verification/route.ts`
- `src/app/api/contact/[id]/route.ts`
- `src/app/api/verify-character/route.ts`
- `src/app/api/admin/ban/[id]/route.ts`
- `src/app/api/admin/disputes/[id]/route.ts`
- `src/app/api/admin/featured/[id]/route.ts`
- `src/app/api/admin/review/[id]/route.ts`
- `src/app/api/admin/verify/[id]/route.ts`

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api-helpers.ts src/app/api/
git commit -m "refactor: standardize API routes with shared auth, error, and rate-limit helpers"
```

---

## Task 5: Add Pagination to Admin Pages

**Files:**
- Modify: `src/app/admin/reviews/page.tsx`
- Modify: `src/app/admin/verifications/page.tsx`
- Modify: `src/app/admin/disputes/page.tsx`

Follow the existing pagination pattern from `src/app/admin/users/page.tsx`.

- [ ] **Step 1: Add pagination to reviews page**

Replace `src/app/admin/reviews/page.tsx`:

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { HideReviewButton } from './HideReviewButton'
import { Stars } from '@/components/ui/Stars'
import { truncate } from '@/lib/utils'

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const admin = createAdminClient()
  const page = Number(searchParams.page ?? 1)
  const perPage = 25
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data: reviews, count } = await admin
    .from('reviews')
    .select(`
      *,
      reviewer:profiles!reviewer_id(display_name),
      serviceiro:profiles!serviceiro_id(display_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalPages = Math.ceil((count ?? 0) / perPage)

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Avaliações</h2>

      {!reviews || reviews.length === 0 ? (
        <p className="text-text-muted">Nenhuma avaliação.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-left">
                  <th className="pb-3 pr-4">Revisor</th>
                  <th className="pb-3 pr-4">Serviceiro</th>
                  <th className="pb-3 pr-4">Nota</th>
                  <th className="pb-3 pr-4">Comentário</th>
                  <th className="pb-3 pr-4">Data</th>
                  <th className="pb-3 pr-4">Visível</th>
                  <th className="pb-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews.map((review: {
                  id: string
                  reviewer: { display_name: string } | null
                  serviceiro: { display_name: string } | null
                  rating: number
                  comment: string | null
                  created_at: string
                  is_visible: boolean
                }) => (
                  <tr key={review.id} className={`hover:bg-bg-card transition-colors ${!review.is_visible ? 'opacity-50' : ''}`}>
                    <td className="py-3 pr-4 text-text-primary">{review.reviewer?.display_name}</td>
                    <td className="py-3 pr-4 text-text-muted">{review.serviceiro?.display_name}</td>
                    <td className="py-3 pr-4"><Stars rating={review.rating} /></td>
                    <td className="py-3 pr-4 text-text-muted max-w-xs">
                      {review.comment ? truncate(review.comment, 60) : '—'}
                    </td>
                    <td className="py-3 pr-4 text-text-muted">{formatDate(review.created_at)}</td>
                    <td className="py-3 pr-4">
                      <span className={review.is_visible ? 'text-status-success' : 'text-status-error'}>
                        {review.is_visible ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="py-3">
                      {review.is_visible && <HideReviewButton reviewId={review.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex gap-2 mt-4 text-sm">
              {page > 1 && (
                <a href={`?page=${page - 1}`} className="text-gold hover:text-gold-bright">← Anterior</a>
              )}
              <span className="text-text-muted">Página {page} de {totalPages}</span>
              {page < totalPages && (
                <a href={`?page=${page + 1}`} className="text-gold hover:text-gold-bright">Próxima →</a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add pagination to verifications page**

Replace `src/app/admin/verifications/page.tsx` with same pattern — add `searchParams`, `page`, `perPage`, `range(from, to)`, `{ count: 'exact' }`, and pagination controls. Same UI as reviews.

```typescript
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'

export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const admin = createAdminClient()
  const page = Number(searchParams.page ?? 1)
  const perPage = 25
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data: requests, count } = await admin
    .from('verification_requests')
    .select('*, serviceiro:profiles!serviceiro_id(display_name)', { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range(from, to)

  const totalPages = Math.ceil((count ?? 0) / perPage)

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
        <>
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

          {totalPages > 1 && (
            <div className="flex gap-2 mt-4 text-sm">
              {page > 1 && (
                <a href={`?page=${page - 1}`} className="text-gold hover:text-gold-bright">← Anterior</a>
              )}
              <span className="text-text-muted">Página {page} de {totalPages}</span>
              {page < totalPages && (
                <a href={`?page=${page + 1}`} className="text-gold hover:text-gold-bright">Próxima →</a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add pagination to disputes page**

Replace `src/app/admin/disputes/page.tsx`:

```typescript
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { DisputeResolveForm } from './DisputeResolveForm'

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const admin = createAdminClient()
  const page = Number(searchParams.page ?? 1)
  const perPage = 25
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data: disputes, count } = await admin
    .from('disputes')
    .select(`
      *,
      booking:bookings(id, service_type, customer_id, serviceiro_id),
      opener:profiles!opened_by(display_name)
    `, { count: 'exact' })
    .eq('status', 'open')
    .order('opened_at', { ascending: true })
    .range(from, to)

  const totalPages = Math.ceil((count ?? 0) / perPage)

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Disputas abertas</h2>

      {!disputes || disputes.length === 0 ? (
        <p className="text-text-muted">Nenhuma disputa aberta.</p>
      ) : (
        <>
          <div className="space-y-6">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="border border-border rounded-lg p-5 bg-bg-card space-y-3">
                <div className="space-y-1">
                  <p className="text-sm text-text-primary font-medium">
                    Aberta por{' '}
                    <span className="text-gold">
                      {(dispute.opener as { display_name: string } | null)?.display_name ?? '—'}
                    </span>
                  </p>
                  {dispute.booking && (
                    <p className="text-xs text-text-muted">
                      Reserva:{' '}
                      <Link
                        href={`/bookings/${(dispute.booking as { id: string }).id}`}
                        className="text-gold hover:text-gold-bright underline"
                      >
                        {(dispute.booking as { id: string }).id.slice(0, 8)}…
                      </Link>
                      {' '}· Serviço:{' '}
                      <span className="text-text-primary">
                        {(dispute.booking as { service_type: string }).service_type}
                      </span>
                    </p>
                  )}
                  <p className="text-sm text-text-primary mt-2">{dispute.reason}</p>
                </div>
                <DisputeResolveForm disputeId={dispute.id} />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex gap-2 mt-4 text-sm">
              {page > 1 && (
                <a href={`?page=${page - 1}`} className="text-gold hover:text-gold-bright">← Anterior</a>
              )}
              <span className="text-text-muted">Página {page} de {totalPages}</span>
              {page < totalPages && (
                <a href={`?page=${page + 1}`} className="text-gold hover:text-gold-bright">Próxima →</a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/reviews/page.tsx src/app/admin/verifications/page.tsx src/app/admin/disputes/page.tsx
git commit -m "feat: add pagination to admin reviews, verifications, and disputes pages"
```

---

## Task 6: Error Boundaries & Retry States

**Files:**
- Create: `src/components/ui/ErrorRetry.tsx`
- Modify: `src/components/booking/BookingThread.tsx`
- Modify: `src/components/serviceiro/CharacterVerificationCard.tsx`

- [ ] **Step 1: Create reusable ErrorRetry component**

```typescript
'use client'
import { Button } from './Button'
import { useLanguage } from '@/lib/language-context'

interface ErrorRetryProps {
  message?: string
  onRetry: () => void
  loading?: boolean
}

export function ErrorRetry({ message, onRetry, loading }: ErrorRetryProps) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <p className="text-status-error text-sm">
        {message ?? t('error_generic')}
      </p>
      <Button size="sm" variant="secondary" onClick={onRetry} loading={loading}>
        {t('error_retry')}
      </Button>
    </div>
  )
}
```

Add i18n keys to all three locales in `src/lib/i18n.ts`:

PT:
```typescript
    error_generic: 'Algo deu errado.',
    error_retry: 'Tentar novamente',
```

EN:
```typescript
    error_generic: 'Something went wrong.',
    error_retry: 'Try again',
```

ES:
```typescript
    error_generic: 'Algo salió mal.',
    error_retry: 'Intentar de nuevo',
```

- [ ] **Step 2: Add error/retry state to BookingThread message fetching**

In `BookingThread.tsx`, add a `messageError` state and update `fetchMessages`:

```typescript
const [messageError, setMessageError] = useState(false)
```

Update `fetchMessages`:
```typescript
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?booking_id=${booking.id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
        setMessageError(false)
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      } else {
        setMessageError(true)
      }
    } catch {
      setMessageError(true)
    }
  }, [booking.id])
```

In the messages display area, add error state:
```typescript
{messageError ? (
  <ErrorRetry onRetry={fetchMessages} />
) : messages.length === 0 ? (
  // ... existing empty state
```

- [ ] **Step 3: Add retry to CharacterVerificationCard**

Read the current file, add an `error` state, show ErrorRetry on failure, and add a retry handler.

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ErrorRetry.tsx src/lib/i18n.ts src/components/booking/BookingThread.tsx src/components/serviceiro/CharacterVerificationCard.tsx
git commit -m "feat: add error boundaries with retry states to message fetch and char verification"
```

---

## Task 7: Notification System

**Files:**
- Create: `supabase/migrations/005-notifications.sql`
- Create: `src/app/api/notifications/route.ts`
- Create: `src/components/layout/NotificationBell.tsx`
- Create: `docs/MIGRATION-STEPS.md`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/i18n.ts`
- Modify: `src/components/layout/Navbar.tsx`
- Modify: `src/app/api/bookings/[id]/route.ts`

- [ ] **Step 1: Create migration SQL**

`supabase/migrations/005-notifications.sql`:

```sql
-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
-- In-app notifications for booking status changes, dispute updates, etc.

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,         -- 'booking_accepted', 'booking_declined', 'dispute_resolved', etc.
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,                   -- relative URL to navigate to (e.g. '/bookings/abc')
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own_read" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_own_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for fast unread count
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
```

- [ ] **Step 2: Create MIGRATION-STEPS.md**

`docs/MIGRATION-STEPS.md`:

```markdown
# Pending Database Migrations

Run these SQL files in your Supabase Dashboard → SQL Editor, in order.

## 005-notifications.sql (2026-03-29)
- Creates `notifications` table with RLS policies
- Required for: notification bell in navbar, booking status notifications

**Status:** PENDING — run this before testing notifications
```

- [ ] **Step 3: Add Notification type to `src/lib/types.ts`**

```typescript
export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}
```

- [ ] **Step 4: Create `src/app/api/notifications/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { getAuthUser, unauthorized, badRequest } from '@/lib/api-helpers'

// GET — fetch recent notifications for the current user
export async function GET() {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return Response.json(data ?? [])
}

// PATCH — mark notifications as read
export async function PATCH(request: NextRequest) {
  const { user, supabase } = await getAuthUser()
  if (!user) return unauthorized()

  const body = await request.json()
  const { ids } = body

  if (!Array.isArray(ids) || ids.length === 0) return badRequest('Missing notification ids')

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .in('id', ids)
    .eq('user_id', user.id)

  return Response.json({ ok: true })
}
```

- [ ] **Step 5: Create `src/components/layout/NotificationBell.tsx`**

```typescript
'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { timeAgo } from '@/lib/utils'
import type { Notification } from '@/lib/types'

export function NotificationBell() {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch {
      // silent
    }
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))

    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: unreadIds }),
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open)
          if (!open && unreadCount > 0) markAllRead()
        }}
        className="relative text-text-muted hover:text-text-primary transition-colors p-1"
        aria-label={t('notif_bell_label')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-status-error text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">{t('notif_title')}</h3>
          </div>
          {notifications.length === 0 ? (
            <p className="text-text-muted text-sm px-4 py-6 text-center">{t('notif_empty')}</p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(n => (
                <div key={n.id} className={`px-4 py-3 ${!n.is_read ? 'bg-gold/5' : ''}`}>
                  {n.link ? (
                    <Link href={n.link} className="block" onClick={() => setOpen(false)}>
                      <p className="text-sm text-text-primary font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-text-muted mt-0.5">{n.body}</p>}
                      <p className="text-xs text-text-muted/60 mt-1">{timeAgo(n.created_at)}</p>
                    </Link>
                  ) : (
                    <div>
                      <p className="text-sm text-text-primary font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-text-muted mt-0.5">{n.body}</p>}
                      <p className="text-xs text-text-muted/60 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Add i18n keys for notifications**

PT:
```typescript
    notif_bell_label: 'Notificações',
    notif_title: 'Notificações',
    notif_empty: 'Nenhuma notificação.',
```

EN:
```typescript
    notif_bell_label: 'Notifications',
    notif_title: 'Notifications',
    notif_empty: 'No notifications.',
```

ES:
```typescript
    notif_bell_label: 'Notificaciones',
    notif_title: 'Notificaciones',
    notif_empty: 'Sin notificaciones.',
```

- [ ] **Step 7: Add NotificationBell to Navbar**

In `src/components/layout/Navbar.tsx`, import `NotificationBell` and add it next to the bookings link when the user is logged in:

After `{t('nav_bookings')}` link, add:
```tsx
<NotificationBell />
```

- [ ] **Step 8: Add notification creation on booking status change**

In `src/app/api/bookings/[id]/route.ts`, after each status change (accept, decline, cancel, mark_complete), insert a notification for the other party using the admin client.

Create a helper in the same file:
```typescript
async function notify(adminClient: ReturnType<typeof createAdminClient>, userId: string, type: string, title: string, body: string | null, link: string) {
  await adminClient.from('notifications').insert({ user_id: userId, type, title, body, link })
}
```

Call it after each action:
- On accept: notify customer "Your booking was accepted"
- On decline: notify customer "Your booking was declined"
- On cancel: notify the other party "Booking was cancelled"
- On mark_complete: notify the other party "marked the booking complete"

- [ ] **Step 9: Verify build**

Run: `npm run build`

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/005-notifications.sql docs/MIGRATION-STEPS.md src/lib/types.ts src/lib/i18n.ts src/app/api/notifications/ src/components/layout/NotificationBell.tsx src/components/layout/Navbar.tsx src/app/api/bookings/
git commit -m "feat: add in-app notification system with bell icon, booking status triggers"
```

---

## Task 8: Serviceiro Analytics Dashboard

**Files:**
- Create: `src/app/api/analytics/route.ts`
- Create: `src/app/dashboard/analytics/page.tsx`
- Create: `src/app/dashboard/analytics/AnalyticsClient.tsx`
- Modify: `src/lib/i18n.ts`
- Modify: `src/app/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Create analytics API route**

`src/app/api/analytics/route.ts`:

```typescript
import { getAuthUserWithProfile, unauthorized, forbidden } from '@/lib/api-helpers'

export async function GET() {
  const { user, profile, supabase } = await getAuthUserWithProfile()
  if (!user) return unauthorized()
  if (!profile || profile.role !== 'serviceiro') return forbidden('Serviceiros only')

  // Bookings by status
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, service_type, status, agreed_price_tc, created_at, completed_at')
    .eq('serviceiro_id', user.id)

  // Reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, created_at')
    .eq('serviceiro_id', user.id)
    .eq('is_visible', true)
    .order('created_at', { ascending: true })

  const completed = bookings?.filter(b => b.status === 'completed') ?? []
  const totalRevenue = completed.reduce((sum, b) => sum + (b.agreed_price_tc ?? 0), 0)

  // Bookings by service type
  const byType: Record<string, number> = {}
  completed.forEach(b => {
    byType[b.service_type] = (byType[b.service_type] ?? 0) + 1
  })

  // Monthly booking counts (last 6 months)
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

  // Rating trend (average per month)
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

  return Response.json({
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
```

- [ ] **Step 2: Create analytics page wrapper**

`src/app/dashboard/analytics/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsClient } from './AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'serviceiro') redirect('/dashboard')

  return <AnalyticsClient />
}
```

- [ ] **Step 3: Create AnalyticsClient component**

`src/app/dashboard/analytics/AnalyticsClient.tsx`:

```typescript
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { useLanguage } from '@/lib/language-context'
import { Skeleton } from '@/components/ui/Skeleton'
import { GAMEPLAY_TYPES } from '@/lib/constants'

interface AnalyticsData {
  totalCompleted: number
  totalRevenue: number
  totalBookings: number
  avgRating: number | null
  reviewCount: number
  byType: Record<string, number>
  monthlyBookings: Record<string, number>
  ratingTrend: { month: string; avg: number }[]
}

export function AnalyticsClient() {
  const { t } = useLanguage()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!data) return null

  const maxMonthly = Math.max(...Object.values(data.monthlyBookings), 1)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-text-primary">{t('analytics_title')}</h1>
        <Link href="/dashboard" className="text-gold hover:text-gold-bright text-sm">
          {t('analytics_back')}
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gold">{data.totalCompleted}</p>
          <p className="text-xs text-text-muted">{t('analytics_completed')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gold">{data.totalRevenue.toLocaleString('pt-BR')} TC</p>
          <p className="text-xs text-text-muted">{t('analytics_revenue')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gold">{data.avgRating ?? '—'}</p>
          <p className="text-xs text-text-muted">{t('analytics_avg_rating')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gold">{data.reviewCount}</p>
          <p className="text-xs text-text-muted">{t('analytics_reviews')}</p>
        </Card>
      </div>

      {/* Monthly bar chart */}
      <Card className="p-6">
        <h2 className="font-semibold text-text-primary mb-4">{t('analytics_monthly')}</h2>
        <div className="flex items-end gap-2 h-40">
          {Object.entries(data.monthlyBookings).map(([month, count]) => (
            <div key={month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-text-muted">{count}</span>
              <div
                className="w-full bg-gold/80 rounded-t-sm transition-all"
                style={{ height: `${(count / maxMonthly) * 100}%`, minHeight: count > 0 ? '4px' : '0px' }}
              />
              <span className="text-[10px] text-text-muted">{month.slice(5)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* By service type */}
      <Card className="p-6">
        <h2 className="font-semibold text-text-primary mb-4">{t('analytics_by_type')}</h2>
        <div className="space-y-3">
          {GAMEPLAY_TYPES.map(g => {
            const count = data.byType[g.key] ?? 0
            const max = Math.max(...Object.values(data.byType), 1)
            return (
              <div key={g.key} className="flex items-center gap-3">
                <span className="text-sm text-text-muted w-20 shrink-0">{g.label}</span>
                <div className="flex-1 bg-border/30 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gold/70 h-full rounded-full transition-all"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-text-primary font-medium w-8 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Add i18n keys**

PT:
```typescript
    analytics_title: 'Análise de desempenho',
    analytics_back: '← Voltar ao dashboard',
    analytics_completed: 'Serviços concluídos',
    analytics_revenue: 'Receita total',
    analytics_avg_rating: 'Avaliação média',
    analytics_reviews: 'Avaliações',
    analytics_monthly: 'Serviços por mês',
    analytics_by_type: 'Por tipo de serviço',
```

EN:
```typescript
    analytics_title: 'Performance Analytics',
    analytics_back: '← Back to dashboard',
    analytics_completed: 'Services completed',
    analytics_revenue: 'Total revenue',
    analytics_avg_rating: 'Avg. rating',
    analytics_reviews: 'Reviews',
    analytics_monthly: 'Services per month',
    analytics_by_type: 'By service type',
```

ES:
```typescript
    analytics_title: 'Análisis de rendimiento',
    analytics_back: '← Volver al panel',
    analytics_completed: 'Servicios completados',
    analytics_revenue: 'Ingresos totales',
    analytics_avg_rating: 'Calificación promedio',
    analytics_reviews: 'Reseñas',
    analytics_monthly: 'Servicios por mes',
    analytics_by_type: 'Por tipo de servicio',
```

- [ ] **Step 5: Add link in DashboardClient.tsx**

Add an analytics link next to "My bookings" in the dashboard header:

```tsx
<Link href="/dashboard/analytics" className="text-gold hover:text-gold-bright text-sm transition-colors">
  {t('dashboard_analytics')}
</Link>
```

Add i18n key: `dashboard_analytics: 'Estatísticas →'` (PT), `'Analytics →'` (EN), `'Estadísticas →'` (ES)

- [ ] **Step 6: Verify build**

Run: `npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/app/api/analytics/ src/app/dashboard/analytics/ src/lib/i18n.ts src/app/dashboard/DashboardClient.tsx
git commit -m "feat: add serviceiro analytics dashboard with revenue, monthly chart, and type breakdown"
```

---

## Task 9: Service Request Matching

**Files:**
- Modify: `src/app/servicos/page.tsx`
- Modify: `src/components/servicerequest/ServiceRequestCard.tsx`
- Modify: `src/components/servicerequest/ServiceRequestFilters.tsx`
- Modify: `src/lib/i18n.ts`

Add vocation and budget range filters to service requests, and show a "match" badge when a logged-in serviceiro's profile fits the request.

- [ ] **Step 1: Update the servicos page to pass serviceiro profile**

Read `src/app/servicos/page.tsx` and add: if the current user is a serviceiro, fetch their serviceiro_profile and pass it to `ServiceRequestsClient` as a new `serviceiroProfile` prop.

- [ ] **Step 2: Add match indicator to ServiceRequestCard**

Add a green "Match" badge when the serviceiro's gameplay_types includes the request's service_type.

```tsx
{isMatch && (
  <span className="text-xs bg-status-success/10 text-status-success border border-status-success/20 px-2 py-0.5 rounded-full">
    {t('requests_match_badge')}
  </span>
)}
```

- [ ] **Step 3: Add vocation filter to ServiceRequestFilters**

The service requests don't have vocation directly, but they have `service_type`. Add a filter for service type multi-select (already exists in the `RequestFilters` interface — verify and enhance if needed).

- [ ] **Step 4: Add i18n keys**

PT: `requests_match_badge: 'Match ✓'`
EN: `requests_match_badge: 'Match ✓'`
ES: `requests_match_badge: 'Match ✓'`

- [ ] **Step 5: Verify build**

Run: `npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/app/servicos/ src/components/servicerequest/ src/lib/i18n.ts
git commit -m "feat: add service request matching indicator for serviceiros"
```

---

## Task 10: Core Test Suite

**Files:**
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Create: `src/__tests__/utils.test.ts`
- Create: `src/__tests__/api-helpers.test.ts`
- Create: `src/__tests__/constants.test.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: Install test dependencies**

```bash
npm install --save-dev jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

- [ ] **Step 2: Create jest.config.ts**

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterSetup: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
}

export default createJestConfig(config)
```

- [ ] **Step 3: Create jest.setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Create utils tests**

`src/__tests__/utils.test.ts`:

```typescript
import { isValidTC, snapToTC, formatTC, sanitizeText, truncate, capitalise } from '@/lib/utils'

describe('isValidTC', () => {
  it('accepts valid TC amounts', () => {
    expect(isValidTC(25)).toBe(true)
    expect(isValidTC(100)).toBe(true)
    expect(isValidTC(1000)).toBe(true)
    expect(isValidTC(100000)).toBe(true)
  })

  it('rejects invalid TC amounts', () => {
    expect(isValidTC(0)).toBe(false)
    expect(isValidTC(10)).toBe(false)
    expect(isValidTC(26)).toBe(false)
    expect(isValidTC(-25)).toBe(false)
    expect(isValidTC(100001)).toBe(false)
    expect(isValidTC(1.5)).toBe(false)
  })
})

describe('snapToTC', () => {
  it('rounds to nearest 25', () => {
    expect(snapToTC(10)).toBe(0)
    expect(snapToTC(13)).toBe(25)
    expect(snapToTC(37)).toBe(25)
    expect(snapToTC(38)).toBe(50)
    expect(snapToTC(100)).toBe(100)
  })
})

describe('formatTC', () => {
  it('formats with locale and TC suffix', () => {
    expect(formatTC(1250)).toContain('1')
    expect(formatTC(1250)).toContain('TC')
  })
})

describe('sanitizeText', () => {
  it('strips HTML tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")')
    expect(sanitizeText('<b>bold</b>')).toBe('bold')
  })

  it('strips javascript: protocol', () => {
    expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)')
  })

  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello')
  })

  it('handles clean input', () => {
    expect(sanitizeText('hello world')).toBe('hello world')
  })
})

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('hi', 10)).toBe('hi')
  })

  it('truncates long strings with ellipsis', () => {
    expect(truncate('hello world!', 8)).toBe('hello...')
  })
})

describe('capitalise', () => {
  it('capitalises first letter', () => {
    expect(capitalise('hello')).toBe('Hello')
  })
})
```

- [ ] **Step 6: Create constants tests**

`src/__tests__/constants.test.ts`:

```typescript
import { VOCATIONS, GAMEPLAY_TYPES, WEEKDAYS, TC_INCREMENT, TC_MIN, TC_MAX } from '@/lib/constants'

describe('constants', () => {
  it('has 5 vocations', () => {
    expect(VOCATIONS).toHaveLength(5)
  })

  it('has 6 gameplay types', () => {
    expect(GAMEPLAY_TYPES).toHaveLength(6)
  })

  it('has 7 weekdays', () => {
    expect(WEEKDAYS).toHaveLength(7)
  })

  it('TC constraints are valid', () => {
    expect(TC_INCREMENT).toBe(25)
    expect(TC_MIN).toBe(25)
    expect(TC_MAX).toBe(100000)
    expect(TC_MAX % TC_INCREMENT).toBe(0)
    expect(TC_MIN % TC_INCREMENT).toBe(0)
  })

  it('all vocations have key and label', () => {
    VOCATIONS.forEach(v => {
      expect(v.key).toBeTruthy()
      expect(v.label).toBeTruthy()
    })
  })

  it('all gameplay types have key, label, and description', () => {
    GAMEPLAY_TYPES.forEach(g => {
      expect(g.key).toBeTruthy()
      expect(g.label).toBeTruthy()
      expect(g.description).toBeTruthy()
    })
  })
})
```

- [ ] **Step 7: Create api-helpers tests**

`src/__tests__/api-helpers.test.ts`:

```typescript
import { apiError, unauthorized, forbidden, notFound, badRequest, serverError, tooManyRequests } from '@/lib/api-helpers'

describe('API error helpers', () => {
  it('apiError returns correct status and body', async () => {
    const res = apiError('test error', 400)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('test error')
  })

  it('unauthorized returns 401', () => {
    expect(unauthorized().status).toBe(401)
  })

  it('forbidden returns 403', () => {
    expect(forbidden().status).toBe(403)
  })

  it('notFound returns 404', () => {
    expect(notFound().status).toBe(404)
  })

  it('badRequest returns 400', () => {
    expect(badRequest('bad').status).toBe(400)
  })

  it('serverError returns 500', () => {
    expect(serverError().status).toBe(500)
  })

  it('tooManyRequests returns 429', () => {
    expect(tooManyRequests().status).toBe(429)
  })
})
```

- [ ] **Step 8: Run tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add jest.config.ts jest.setup.ts src/__tests__/ package.json package-lock.json
git commit -m "test: add Jest setup and core test suite for utils, constants, and api-helpers"
```

---

## Execution Wave Summary

| Wave | Tasks | Strategy | File Conflicts |
|------|-------|----------|----------------|
| 1 | 1, 2+3 combined | Task 1 parallel with Task 2+3 (combined agent) | None after combining |
| 2 | 4, 5 | Parallel | None |
| 3 | 6, 7, 8 | Parallel | i18n.ts touched by all — run 6 first (small change), then 7+8 parallel |
| 4 | 9 | Solo | None |
| 5 | 10 | Solo | None |

**REMINDER:** Migration `005-notifications.sql` must be run in Supabase SQL Editor before testing notifications. See `docs/MIGRATION-STEPS.md`.
