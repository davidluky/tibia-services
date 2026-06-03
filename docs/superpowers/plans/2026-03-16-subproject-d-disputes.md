# Sub-project D: Dispute Resolution — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow booking participants to open a dispute on any active booking, freezing it in a `disputed` state, and allow admins to resolve it with a written resolution, transitioning it to `resolved`.

**Architecture:** A new `disputes` table (with RLS) is linked one-to-one to a booking; two new status enum values (`disputed`, `resolved`) are added to `booking_status`. Two API routes handle creation (POST, user-facing) and resolution (PATCH, admin-only). The existing `BookingThread` sidebar gains an inline dispute form and two new status-state display cards. A new admin page lists open disputes with an inline resolve form.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (PostgreSQL + RLS + Auth), `createClient()` for auth checks, `createAdminClient()` for DB mutations, `NextResponse` from `next/server`.

---

## Chunk 1: Database + Types

### Task 1: SQL migration + type updates

**Files:**
- Create: `supabase/migrations/002-disputes.sql`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/002-disputes.sql`:

```sql
-- Run this in Supabase Dashboard → SQL Editor
-- Adds dispute resolution support: new booking statuses + disputes table

-- Add new booking status values
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'disputed';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'resolved';

-- Dispute status enum
CREATE TYPE dispute_status AS ENUM ('open', 'resolved');

-- Disputes table
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

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disputes_participant_read" ON disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = disputes.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.serviceiro_id = auth.uid())
    )
  );

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

- [ ] **Step 2: Add `Dispute` interface to `src/lib/types.ts`**

After the `Message` interface, add:

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

- [ ] **Step 3: Update `Booking` interface in `src/lib/types.ts`**

Find the `status` field in the `Booking` interface:
```typescript
status: 'pending' | 'active' | 'completed' | 'declined' | 'cancelled'
```

Replace with:
```typescript
status: 'pending' | 'active' | 'completed' | 'declined' | 'cancelled' | 'disputed' | 'resolved'
```

Also add an optional `dispute` field after the existing optional join fields (`customer?`, `serviceiro?`):
```typescript
dispute?: Dispute
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add supabase/migrations/002-disputes.sql src/lib/types.ts && git commit -m "feat(disputes): add disputes table migration and Dispute/Booking type updates"
```

---

## Chunk 2: API Routes

### Task 2: POST /api/disputes + PATCH /api/admin/disputes/[id]

**Files:**
- Create: `src/app/api/disputes/route.ts`
- Create: `src/app/api/admin/disputes/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/disputes/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await request.json()
  const { booking_id, reason } = body

  if (!booking_id || typeof booking_id !== 'string') {
    return NextResponse.json({ error: 'booking_id inválido.' }, { status: 400 })
  }
  if (typeof reason !== 'string' || reason.length < 10 || reason.length > 500) {
    return NextResponse.json({ error: 'O motivo deve ter entre 10 e 500 caracteres.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select('id, customer_id, serviceiro_id, status')
    .eq('id', booking_id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })

  if (booking.customer_id !== user.id && booking.serviceiro_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  if (booking.status !== 'active') {
    return NextResponse.json({ error: 'Reserva não está ativa.' }, { status: 409 })
  }

  const { data: existing } = await admin
    .from('disputes')
    .select('id')
    .eq('booking_id', booking_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Já existe uma disputa para esta reserva.' }, { status: 409 })
  }

  const { data: dispute, error: insertError } = await admin
    .from('disputes')
    .insert({ booking_id, opened_by: user.id, reason })
    .select('id')
    .single()

  if (insertError || !dispute) {
    return NextResponse.json({ error: 'Erro ao criar disputa.' }, { status: 500 })
  }

  const { error: updateError } = await admin
    .from('bookings')
    .update({ status: 'disputed' })
    .eq('id', booking_id)

  if (updateError) {
    console.error('[disputes] Failed to update booking status:', updateError)
  }

  return NextResponse.json({ id: dispute.id })
}
```

- [ ] **Step 2: Create `src/app/api/admin/disputes/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const body = await request.json()
  const { resolution } = body

  if (typeof resolution !== 'string' || resolution.length < 10 || resolution.length > 500) {
    return NextResponse.json({ error: 'A resolução deve ter entre 10 e 500 caracteres.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: dispute } = await admin
    .from('disputes')
    .select('id, booking_id, status')
    .eq('id', params.id)
    .single()

  if (!dispute) return NextResponse.json({ error: 'Disputa não encontrada.' }, { status: 404 })

  if (dispute.status !== 'open') {
    return NextResponse.json({ error: 'Disputa já foi resolvida.' }, { status: 409 })
  }

  await admin.from('disputes').update({
    status: 'resolved',
    resolution,
    resolved_by: user.id,
    resolved_at: new Date().toISOString(),
  }).eq('id', params.id)

  const { error: bookingError } = await admin
    .from('bookings')
    .update({ status: 'resolved' })
    .eq('id', dispute.booking_id)

  if (bookingError) {
    console.error('[disputes] Failed to update booking status to resolved:', bookingError)
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/app/api/disputes/route.ts "src/app/api/admin/disputes/[id]/route.ts" && git commit -m "feat(disputes): add POST /api/disputes and PATCH /api/admin/disputes/[id] routes"
```

---

## Chunk 3: Booking Detail UI

### Task 3: bookings/[id]/page.tsx + BookingThread.tsx

**Files:**
- Modify: `src/app/bookings/[id]/page.tsx`
- Modify: `src/components/booking/BookingThread.tsx`

- [ ] **Step 1: Update `src/app/bookings/[id]/page.tsx`**

Read the file. After the `existingReview` query, add the conditional dispute fetch:

```typescript
  // Fetch dispute if booking is disputed or resolved
  const { data: dispute } = booking.status === 'disputed' || booking.status === 'resolved'
    ? await supabase
        .from('disputes')
        .select('*, opener:profiles!opened_by(display_name)')
        .eq('booking_id', params.id)
        .single()
    : { data: null }
```

Then pass `dispute` to `BookingThread`:
```tsx
      <BookingThread
        booking={booking}
        currentUserId={user.id}
        currentUserRole={profile?.role ?? 'customer'}
        dispute={dispute ?? undefined}
      />
```

- [ ] **Step 2: Update `src/components/booking/BookingThread.tsx`**

Read the file, then make these targeted changes:

**a) Update imports** — add `Dispute` to the type import:
```typescript
import type { Booking, Message, Dispute } from '@/lib/types'
```

**b) Update `BookingThreadProps`** — add `dispute` prop:
```typescript
interface BookingThreadProps {
  booking: Booking
  currentUserId: string
  currentUserRole: string
  dispute?: Dispute
}
```

**c) Update `STATUS_VARIANTS`** — add two new entries:
```typescript
  disputed: 'bg-status-warning/10 text-status-warning border border-status-warning/30',
  resolved: 'bg-border/50 text-text-muted border border-border',
```

**d) Update function signature** — destructure `dispute`:
```typescript
export function BookingThread({ booking: initialBooking, currentUserId, currentUserRole, dispute }: BookingThreadProps) {
```

**e) Add dispute form state** — after the existing `[error, setError]` state:
```typescript
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeLoading, setDisputeLoading] = useState(false)
  const [disputeError, setDisputeError] = useState('')
```

**f) Add `submitDispute` handler** — after the `doAction` function:
```typescript
  const submitDispute = async () => {
    if (disputeReason.length < 10 || disputeReason.length > 500) {
      setDisputeError('O motivo deve ter entre 10 e 500 caracteres.')
      return
    }
    setDisputeLoading(true)
    setDisputeError('')

    const res = await fetch('/api/disputes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: booking.id, reason: disputeReason }),
    })

    if (res.ok) {
      window.location.reload()
    } else {
      const data = await res.json()
      setDisputeError(data.error ?? 'Erro ao abrir disputa.')
      setDisputeLoading(false)
    }
  }
```

**g) Add disputed state card** — inside the main messages column (lg:col-span-2 div), after the messages Card closing tag:
```tsx
        {/* Disputed state card */}
        {booking.status === 'disputed' && dispute && (
          <Card className="p-4 border border-status-warning/30 bg-status-warning/5">
            <h3 className="text-sm font-semibold text-status-warning mb-2">Esta reserva está em disputa</h3>
            <p className="text-sm text-text-primary mb-1">
              <span className="text-text-muted">Motivo: </span>{dispute.reason}
            </p>
            <p className="text-xs text-text-muted">
              Aberta por <span className="text-text-primary">{dispute.opener?.display_name ?? 'participante'}</span>
            </p>
            <p className="text-xs text-text-muted mt-2">Aguardando resolução do admin.</p>
          </Card>
        )}

        {/* Resolved state card */}
        {booking.status === 'resolved' && dispute && (
          <Card className="p-4 border border-border bg-border/10">
            <h3 className="text-sm font-semibold text-text-muted mb-2">Disputa resolvida</h3>
            <p className="text-sm text-text-primary">{dispute.resolution}</p>
          </Card>
        )}
```

**h) Add dispute button/form** — in the sidebar (space-y-4 div), after the Cancel button:
```tsx
        {/* Dispute form (only when active) */}
        {booking.status === 'active' && (
          <div>
            {!showDisputeForm ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDisputeForm(true)}
                className="w-full"
              >
                Abrir Disputa
              </Button>
            ) : (
              <Card className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-status-warning">Abrir Disputa</h3>
                <textarea
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                  placeholder="Descreva o motivo da disputa (10–500 caracteres)"
                  rows={4}
                  minLength={10}
                  maxLength={500}
                  className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-status-warning resize-none"
                />
                <p className="text-xs text-text-muted text-right">{disputeReason.length}/500</p>
                {disputeError && (
                  <p className="text-status-error text-xs">{disputeError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={submitDispute}
                    loading={disputeLoading}
                    className="flex-1"
                  >
                    Confirmar Disputa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowDisputeForm(false); setDisputeReason(''); setDisputeError('') }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add "src/app/bookings/[id]/page.tsx" src/components/booking/BookingThread.tsx && git commit -m "feat(disputes): add dispute form and status display to BookingThread"
```

---

## Chunk 4: Admin Panel

### Task 4: Admin disputes page + resolve form + nav link

**Files:**
- Create: `src/app/admin/disputes/page.tsx`
- Create: `src/app/admin/disputes/DisputeResolveForm.tsx`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create `src/app/admin/disputes/page.tsx`**

```typescript
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { DisputeResolveForm } from './DisputeResolveForm'

export default async function AdminDisputesPage() {
  const admin = createAdminClient()

  const { data: disputes } = await admin
    .from('disputes')
    .select(`
      *,
      booking:bookings(id, service_type, customer_id, serviceiro_id),
      opener:profiles!opened_by(display_name)
    `)
    .eq('status', 'open')
    .order('opened_at', { ascending: true })
    .limit(50)

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Disputas abertas</h2>

      {!disputes || disputes.length === 0 ? (
        <p className="text-text-muted">Nenhuma disputa aberta.</p>
      ) : (
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
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/admin/disputes/DisputeResolveForm.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface DisputeResolveFormProps {
  disputeId: string
}

export function DisputeResolveForm({ disputeId }: DisputeResolveFormProps) {
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

    const res = await fetch(`/api/admin/disputes/${disputeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Erro ao resolver disputa.')
      setLoading(false)
    } else {
      window.location.reload()
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

- [ ] **Step 3: Add "Disputas" link to `src/app/admin/layout.tsx`**

Read the file, find the `<nav>` block, and add after the last existing nav link:
```tsx
          <a href="/admin/disputes" className="text-text-muted hover:text-gold transition-colors">Disputas</a>
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/app/admin/disputes/page.tsx src/app/admin/disputes/DisputeResolveForm.tsx src/app/admin/layout.tsx && git commit -m "feat(disputes): add admin disputes page, resolve form, and nav link"
```
