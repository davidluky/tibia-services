# Sub-project F: Featured Listings (Tibia Coins Payment)

## Goal

Allow serviceiros to pay in Tibia Coins (TC) to have their profile pinned to the top of the browse page and visually highlighted. Payment is sent in-game to a designated character; an admin confirms receipt manually (automated verification to come later).

## Context

The browse page currently sorts by `is_registered` then `avg_rating`. Featured listings sit above all non-featured serviceiros, sorted among themselves by `avg_rating`. Cost is 25 TC/day, with duration determined by the amount sent.

The receiving character is **Cursos Senai**.

---

## Architecture

1. Serviceiro selects days (1–30) on dashboard → sees TC amount and payment instructions → submits request (status: `pending`)
2. Admin confirms TC received in admin panel → status: `active`, `expires_at` set
3. If 24h passes without confirmation → treated as timed out (query-time check, no DB change)
4. If serviceiro cancels → status: `canceled`
5. Browse page: featured (active + expires\_at > NOW()) pinned to top, sorted by rating; visually highlighted in ServiceiroCard

**Expiry:** Query-time only (Option A — no cron). "Is featured" = `status = 'active' AND expires_at > NOW()`. "Timed out pending" = `status = 'pending' AND requested_at < NOW() - interval '24 hours'`.

**One active/pending listing per serviceiro at a time** enforced at the API layer.

---

## Chunk 1: Database

### Migration: `supabase/migrations/003-featured-listings.sql`

```sql
CREATE TYPE featured_status AS ENUM ('pending', 'active', 'canceled');

CREATE TABLE featured_listings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serviceiro_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tc_amount       INTEGER NOT NULL CHECK (tc_amount > 0 AND tc_amount % 25 = 0),
  days_requested  INTEGER NOT NULL GENERATED ALWAYS AS (tc_amount / 25) STORED,
  status          featured_status NOT NULL DEFAULT 'pending',
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ
);

CREATE INDEX idx_featured_serviceiro ON featured_listings (serviceiro_id);
CREATE INDEX idx_featured_status ON featured_listings (status, expires_at);

ALTER TABLE featured_listings ENABLE ROW LEVEL SECURITY;

-- Serviceiros can read their own listings
CREATE POLICY "featured_own_read" ON featured_listings
  FOR SELECT USING (auth.uid() = serviceiro_id);

-- Serviceiros can insert their own listings
CREATE POLICY "featured_own_insert" ON featured_listings
  FOR INSERT WITH CHECK (auth.uid() = serviceiro_id);
```

### Types: `src/lib/types.ts`

Add `FeaturedListing` interface:
```typescript
export interface FeaturedListing {
  id: string
  serviceiro_id: string
  tc_amount: number
  days_requested: number
  status: 'pending' | 'active' | 'canceled'
  requested_at: string
  confirmed_at: string | null
  expires_at: string | null
}
```

Add optional `featured_until` field to `ServiceiroProfile`:
```typescript
featured_until?: string | null  // expires_at when active and not expired, null otherwise
```

---

## Chunk 2: API Routes

### `GET /api/featured`

Auth required. Role must be `serviceiro`.

Returns the serviceiro's most recent non-canceled listing (if any):
```typescript
// Returns:
{ listing: FeaturedListing | null }
```

Fetch using admin client: most recent listing for `user.id` where `status != 'canceled'`, ordered by `requested_at DESC`, limit 1.

### `POST /api/featured`

Auth required. Role must be `serviceiro`.

Body: `{ tc_amount: number }`

Validation:
- `tc_amount` must be an integer, multiple of 25, minimum 25, maximum 750 (30 days)

Steps:
1. Check no existing active-or-pending listing: query `featured_listings` where `serviceiro_id = user.id` and `(status = 'pending' OR (status = 'active' AND expires_at > NOW()))` — return 409 if exists with `{ error: 'Você já tem um destaque ativo ou pendente.' }`
2. Insert: `{ serviceiro_id: user.id, tc_amount }`
3. Return `{ id }`

Use admin client for all DB ops.

### `DELETE /api/featured/[id]`

Auth required. Serviceiro cancels their own pending listing.

Steps:
1. Fetch listing via admin client — 404 if not found
2. Verify `listing.serviceiro_id === user.id` — 403 if not
3. Verify `listing.status === 'pending'` — 409 if not (cannot cancel active)
4. Update `status = 'canceled'`
5. Return `{ success: true }`

### `PATCH /api/admin/featured/[id]`

Auth required. Admin only (check `profiles.role === 'admin'`).

Steps:
1. Fetch listing via admin client — 404 if not found
2. Verify `listing.status === 'pending'` — 409 if already active/canceled
3. Update: `{ status: 'active', confirmed_at: NOW(), expires_at: NOW() + listing.days_requested * interval '1 day' }`
   - In TypeScript: `expires_at = new Date(Date.now() + listing.days_requested * 24 * 60 * 60 * 1000).toISOString()`
4. Return `{ success: true }`

---

## Chunk 3: Browse Page

### `src/lib/serviceiros.ts` (or wherever `getAllServiceiros` lives)

Add a LEFT JOIN / separate query to get active featured listings. After fetching all serviceiros, fetch currently featured serviceiro IDs:

```typescript
const { data: featured } = await supabase
  .from('featured_listings')
  .select('serviceiro_id, expires_at')
  .eq('status', 'active')
  .gt('expires_at', new Date().toISOString())
```

Build a `Set<string>` of featured serviceiro IDs. When constructing each serviceiro result object, add:
```typescript
featured_until: featuredMap.get(sp.id) ?? null
```

Sort result: featured first (sorted by `avg_rating` desc), then non-featured (existing sort: `is_registered` desc, `avg_rating` desc).

### `src/components/serviceiro/ServiceiroCard.tsx`

Add `isFeatured?: boolean` prop.

When `isFeatured`:
- Add a `⭐ Destacado` badge at the top of the card (gold text, small, above the display name)
- Apply a stronger gold border/glow: `border-gold shadow-gold/20 shadow-md` (replace existing conditional border)

---

## Chunk 4: Dashboard UI

### New file: `src/components/serviceiro/FeaturedListingCard.tsx`

`'use client'` component. Self-fetches from `GET /api/featured` on mount.

**Props:** none

**States:**

1. **Loading** — `<Card className="p-6"><p className="text-sm text-text-muted">Carregando...</p></Card>`

2. **No listing** (listing is null or all canceled):
   - Day picker: number input (min 1, max 30, step 1), shows TC cost (`days × 25 TC`)
   - Instructions block: *"Após solicitar, envie exatamente {tc} TC para o personagem **Cursos Senai** em tibia.com. Seu perfil será destacado assim que o pagamento for confirmado (em até 24h)."*
   - "Solicitar Destaque" button → POST /api/featured → transitions to pending state
   - Show error inline on failure

3. **Pending** (status = 'pending' AND requested_at within 24h):
   - Show: *"Aguardando confirmação do pagamento."*
   - Show: *"Envie exatamente {tc_amount} TC para Cursos Senai em tibia.com."*
   - Show countdown: hours remaining until 24h timeout (calculated client-side from `requested_at`)
   - Cancel button → DELETE /api/featured/[id] → reload state

4. **Timed out** (status = 'pending' AND requested_at > 24h ago — detected client-side):
   - Show: *"Pagamento não confirmado em 24h. Pedido cancelado automaticamente."*
   - "Solicitar novo destaque" button → DELETE /api/featured/[id] first, then reset to no-listing state

5. **Active** (status = 'active' AND expires_at > NOW()):
   - Show: *"✓ Seu perfil está em destaque"*
   - Show: *"Válido até [formatted expires_at date]. ([X] dias restantes)"*
   - Note: *"Para estender, entre em contato com o admin após o vencimento."*

**Integrate into dashboard:** In `src/app/dashboard/DashboardClient.tsx`, inside the `profile.role === 'serviceiro'` block, after `<CharacterVerificationCard />`, add:
```tsx
<FeaturedListingCard />
```
Import: `import { FeaturedListingCard } from '@/components/serviceiro/FeaturedListingCard'`

---

## Chunk 5: Admin Panel

### New file: `src/app/admin/featured/page.tsx`

Server component. Uses `createAdminClient()`.

Fetches two lists:

```typescript
// Pending listings (including timed-out ones)
const { data: pending } = await admin
  .from('featured_listings')
  .select('*, serviceiro:profiles!serviceiro_id(display_name)')
  .eq('status', 'pending')
  .order('requested_at', { ascending: true })

// Currently active featured listings
const { data: active } = await admin
  .from('featured_listings')
  .select('*, serviceiro:profiles!serviceiro_id(display_name)')
  .eq('status', 'active')
  .gt('expires_at', new Date().toISOString())
  .order('expires_at', { ascending: true })
```

**Renders:**
- **"Pagamentos pendentes"** section: list of pending listings. For each:
  - Serviceiro display_name, tc_amount, days_requested, "solicitado X horas atrás"
  - If timed out (>24h): grey/muted row, label "Expirado — não pago"
  - If within 24h: `<FeaturedConfirmForm listingId={listing.id} />` client component

- **"Destaques ativos"** section: list of active listings. For each:
  - Serviceiro display_name, tc_amount, days_requested, "expira em [date]"

### New file: `src/app/admin/featured/FeaturedConfirmForm.tsx`

`'use client'` component. Props: `{ listingId: string }`.
- "Confirmar pagamento" button → `PATCH /api/admin/featured/{listingId}`
- On success: `window.location.reload()`
- Show error on failure

### `src/app/admin/layout.tsx`

Add nav link: `<a href="/admin/featured" ...>Destaques</a>`

---

## What is NOT in scope

- Automated TC payment verification (planned for later)
- Extending an active listing (user contacts admin manually)
- Multiple simultaneous featured tiers (just one featured status)
- Featured listing history/analytics
- Email notifications for featured listing confirmation
- TC refunds for canceled pending listings
