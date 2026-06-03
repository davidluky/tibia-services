# Sub-project D: Dispute Resolution

## Goal

Allow either booking participant to open a dispute when a booking goes wrong. Admin reviews open disputes and resolves them. Dispute resolution is the final state of a disputed booking.

## Context

Current booking status machine: `pending → active → completed | declined | cancelled`

After this sub-project: `active → disputed → resolved` is an additional path.

The `disputes` table stores the dispute details. The `bookings` table gets two new status values: `disputed` and `resolved`.

---

## Chunk 1: Database Schema

### Migration: `supabase/migrations/002-disputes.sql`

```sql
-- Add new booking status values
-- In PostgreSQL, you cannot remove enum values, only add them.
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'disputed';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'resolved';

-- Dispute status enum (matches project convention of using enums)
CREATE TYPE dispute_status AS ENUM ('open', 'resolved');

-- Disputes table
-- UNIQUE (booking_id) enforces one dispute per booking at the DB level,
-- preventing race conditions in the API's deduplication check.
CREATE TABLE disputes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  opened_by     UUID NOT NULL REFERENCES profiles(id),
  reason        TEXT NOT NULL,
  status        dispute_status NOT NULL DEFAULT 'open',
  resolution    TEXT,
  resolved_by   UUID REFERENCES profiles(id),
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX idx_disputes_booking ON disputes (booking_id);
CREATE INDEX idx_disputes_status ON disputes (status);

-- RLS
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Booking participants can read their own disputes
CREATE POLICY "disputes_participant_read" ON disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = disputes.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.serviceiro_id = auth.uid())
    )
  );

-- Booking participants can insert a dispute (only for their own bookings)
-- Note: the API route uses createAdminClient() for inserts to bypass RLS complications
-- with the new enum status values. This INSERT policy exists for direct DB access
-- protection only, not as the primary enforcement path.
CREATE POLICY "disputes_participant_insert" ON disputes
  FOR INSERT WITH CHECK (
    auth.uid() = opened_by AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = disputes.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.serviceiro_id = auth.uid())
      AND bookings.status = 'active'
    )
  );
```

### Type updates

Add to `src/lib/types.ts`:

```typescript
export interface Dispute {
  id: string
  booking_id: string
  opened_by: string
  reason: string
  status: 'open' | 'resolved'
  resolution: string | null
  resolved_by: string | null
  opened_at: string
  resolved_at: string | null
  // Joined fields
  opener?: { display_name: string }
}
```

Update `Booking` type — extend the status union:
```typescript
status: 'pending' | 'active' | 'completed' | 'declined' | 'cancelled' | 'disputed' | 'resolved'
```

Also add `dispute?: Dispute` as an optional join field on the Booking type.

---

## Chunk 2: API Routes

### `POST /api/disputes`

Creates a dispute. Sets booking status to `'disputed'`.

**Auth:** Must be logged in. Must be a participant in the booking. Booking must be `'active'`.

**Body:** `{ booking_id: string, reason: string }`

**Validation:**
- `booking_id`: required UUID
- `reason`: required, min 10 chars, max 500 chars

**Steps:**
1. Verify auth
2. Fetch booking using admin client — verify it exists, user is a participant, status is `'active'`
3. Check no existing dispute for this booking: `SELECT id FROM disputes WHERE booking_id = ?` — return 409 if exists (the UNIQUE constraint also enforces this at DB level, providing a race-condition-safe fallback)
4. Insert dispute row using admin client: `{ booking_id, opened_by: user.id, reason }`
5. Update booking status to `'disputed'` using admin client
   - Note: steps 4 and 5 are not wrapped in a DB transaction. If step 5 fails, a dispute row exists but the booking remains `'active'`. This is acceptable for now — admin can manually correct. Log the error clearly.
6. Return `{ id: dispute.id }`

Use admin client throughout to avoid RLS complications with the new `'disputed'`/`'resolved'` enum values added to `booking_status`.

### `PATCH /api/admin/disputes/[id]`

Resolves a dispute. Admin only.

**Body:** `{ resolution: string }`

**Validation:** `resolution`: required, min 10 chars, max 500 chars

**Steps:**
1. Verify auth + admin role
2. Fetch dispute (admin client) — verify it exists and status is `'open'`; return 404 if not found, 409 if already resolved
3. `booking_id` is available on the fetched dispute row
4. Update dispute in a single call: `{ status: 'resolved', resolution, resolved_by: user.id, resolved_at: new Date().toISOString() }`
5. Update booking status to `'resolved'` — if this call fails, log the error but return success (admin can see the dispute is resolved and manually correct the booking if needed)
6. Return `{ success: true }`

Both operations use admin client.

---

## Chunk 3: Booking Detail UI

### `src/app/bookings/[id]/page.tsx` changes

The page already fetches the booking with participant profiles. Add:
- Fetch dispute if booking status is `'disputed'` or `'resolved'`:
  ```typescript
  const { data: dispute } = booking.status === 'disputed' || booking.status === 'resolved'
    ? await supabase.from('disputes').select('*, opener:profiles!opened_by(display_name)').eq('booking_id', params.id).single()
    : { data: null }
  ```
- Pass `dispute` to `BookingThread` as an optional prop

Do NOT pass a `canDispute` prop — `BookingThread` will gate the dispute form solely on `booking.status === 'active'` internally.

### `src/components/booking/BookingThread.tsx` changes

**Interface update:** Add `dispute?: Dispute` to `BookingThreadProps`. Import `Dispute` from `@/lib/types`.

**`STATUS_VARIANTS` update:** Add entries for `'disputed'` and `'resolved'` so the status badge renders correctly:
```typescript
disputed: 'bg-status-warning/10 text-status-warning border-status-warning/30',
resolved: 'bg-border/50 text-text-muted border-border',
```

**New behavior:**

1. **Dispute form** — when `booking.status === 'active'`:
   - A "Abrir Disputa" button (at the bottom of actions, styled as a danger/secondary action)
   - Clicking expands an inline form with a textarea for reason (10–500 chars) + submit button
   - On submit: `POST /api/disputes` with `{ booking_id, reason }`
   - On success: `window.location.reload()` to show the updated disputed state

2. **Disputed state** — when `booking.status === 'disputed'` and `dispute` prop is provided:
   - Show a warning card: "Esta reserva está em disputa"
   - Show: reason text, who opened it (`dispute.opener?.display_name`), "Aguardando resolução do admin"
   - **Messaging is NOT available** for disputed bookings — the existing code gates messages on `status === 'active'`, which is correct and intentional. Do not change this.

3. **Resolved state** — when `booking.status === 'resolved'` and `dispute` prop is provided:
   - Show a muted card: "Disputa resolvida" + resolution text (`dispute.resolution`)

Do NOT show the dispute form for completed, declined, cancelled, disputed, or resolved bookings.

---

## Chunk 4: Admin Panel

### New file: `src/app/admin/disputes/page.tsx`

Server component. Fetches all open disputes with booking and opener info:

```typescript
const { data: disputes } = await adminSupabase
  .from('disputes')
  .select(`
    *,
    booking:bookings(id, service_type, customer_id, serviceiro_id),
    opener:profiles!opened_by(display_name)
  `)
  .eq('status', 'open')
  .order('opened_at', { ascending: true })
  .limit(50)
```

Renders a list of open disputes. Each item shows:
- Who opened it, when
- Booking ID (link to `/bookings/{id}`)
- Service type
- Reason text
- `DisputeResolveForm` client component

### New file: `src/app/admin/disputes/DisputeResolveForm.tsx`

`'use client'` component. Props: `{ disputeId: string }`.
- Textarea for resolution (min 10, max 500 chars)
- "Resolver" button → `PATCH /api/admin/disputes/{disputeId}`
- On success: refresh page

### Admin nav link

Add "Disputas" link to the admin navigation in `src/app/admin/layout.tsx`.

---

## What is NOT in scope

- Email notifications when a dispute is opened or resolved (could be added as part of Sub-project B extension)
- Chat/messaging within the dispute (existing booking messages still work)
- Dispute categories or tags
- Appealing a resolved dispute
- Pagination of the admin disputes list
