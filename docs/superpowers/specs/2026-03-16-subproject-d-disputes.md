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

-- Disputes table
CREATE TABLE disputes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  opened_by     UUID NOT NULL REFERENCES profiles(id),
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'resolved')),
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
2. Fetch booking — verify it exists, user is a participant, status is `'active'`
3. Check no existing open dispute for this booking (one dispute at a time)
4. Insert dispute row: `{ booking_id, opened_by: user.id, reason }`
5. Update booking status to `'disputed'` using admin client (to bypass `bookings_participant_update` RLS which may not allow new status values)
6. Return `{ id: dispute.id }`

Use admin client for both the insert and the booking update to avoid RLS edge cases with the new enum values.

### `PATCH /api/admin/disputes/[id]`

Resolves a dispute. Admin only.

**Body:** `{ resolution: string }`

**Validation:** `resolution`: required, min 10 chars, max 500 chars

**Steps:**
1. Verify auth + admin role
2. Fetch dispute (admin client) — verify it exists and status is `'open'`
3. Fetch `booking_id` from the dispute
4. Update dispute: `{ status: 'resolved', resolution, resolved_by: user.id, resolved_at: now }`
5. Update booking status to `'resolved'`
6. Return `{ success: true }`

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
- Pass `dispute` and `canDispute` to `BookingThread`

`canDispute` = booking status is `'active'` (not already disputed/resolved)

### `src/components/booking/BookingThread.tsx` changes

The component already handles booking actions. Add:

1. **Dispute section** — when `booking.status === 'active'` and `canDispute`:
   - A "Abrir Disputa" button that expands an inline form
   - Form: textarea for reason (10–500 chars), submit button
   - On submit: `POST /api/disputes`
   - On success: reload the page (or update state to show disputed UI)

2. **Disputed state** — when `booking.status === 'disputed'`:
   - Card showing: "Esta reserva está em disputa" + reason + who opened it + "Aguardando resolução do admin"
   - No further actions available (except messaging if still needed — leave messaging as-is)

3. **Resolved state** — when `booking.status === 'resolved'`:
   - Card showing: "Disputa resolvida" + resolution text

Do NOT show the dispute form for completed, declined, or cancelled bookings.

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
