# Sub-project B: Email Notifications

## Goal

Send transactional emails to booking participants when the booking status changes, using Resend as the email provider.

## Scope

5 email triggers, booking events only. Fire-and-forget: email failure never blocks the booking action.

## Architecture

A shared module `src/lib/email.ts` exports typed async functions for each email event. The existing API routes call these functions after their successful DB writes. No new tables required.

---

## Chunk 1: Module, Environment, and Route Integration

### Email Provider

**Resend** (`resend` npm package). One API key, one `from` address. Both are env vars.

New env vars (add to `.env.local.example`):
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

> For local dev, Resend provides `onboarding@resend.dev` as a test `from` address that works without a verified domain.

### Getting recipient email addresses

The booking routes only have user IDs, not email addresses. Emails are stored in `auth.users`, not in `profiles`. Use `createAdminClient().auth.admin.getUserById(userId)` to fetch them.

```typescript
async function getEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(userId)
  return data.user?.email ?? null
}
```

### `src/lib/email.ts` — Module API

```typescript
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@tibia-services.com'
const BASE_URL = process.env.APP_URL ?? 'http://localhost:3000'

// Internal helper
async function getEmail(userId: string): Promise<string | null>

// Public functions (all fire-and-forget — never throw)
export async function sendBookingCreated(opts: {
  bookingId: string
  serviceiroId: string
  customerName: string
  serviceType: string
}): Promise<void>

export async function sendBookingAccepted(opts: {
  bookingId: string
  customerId: string
  serviceiroName: string
  serviceType: string
}): Promise<void>

export async function sendBookingDeclined(opts: {
  bookingId: string
  customerId: string
  serviceiroName: string
  serviceType: string
}): Promise<void>

export async function sendBookingCompleted(opts: {
  bookingId: string
  customerId: string
  serviceiroName: string
}): Promise<void>

export async function sendBookingCancelled(opts: {
  bookingId: string
  recipientId: string
  cancellerName: string
  serviceType: string
}): Promise<void>
```

Each function:
1. Fetches recipient email via `getEmail()`
2. If email is null, logs and returns (no throw)
3. Calls `resend.emails.send(...)` in a try/catch — on error, `console.error` and return (no throw)

### Email content (Portuguese, plain HTML)

All emails are plain HTML strings — no JSX renderer, no template engine. Inline styles for maximum email client compatibility. Dark theme is not used (email clients don't support CSS vars) — use white background with dark text.

Each email includes:
- A header with the app name "Tibia Services"
- A short message body
- A CTA button linking to `{BASE_URL}/bookings/{bookingId}`
- A footer: "Tibia Services — você recebeu este email porque tem uma reserva ativa."

**5 email subjects and bodies (Portuguese):**

| Trigger | Subject | Body summary |
|---------|---------|-------------|
| Booking created | `Nova reserva de {customerName}` | "Você recebeu uma nova reserva para {serviceType}. Acesse para aceitar ou recusar." |
| Booking accepted | `{serviceiroName} aceitou sua reserva` | "Sua reserva de {serviceType} foi aceita. Acesse para combinar os detalhes." |
| Booking declined | `{serviceiroName} recusou sua reserva` | "Sua reserva de {serviceType} foi recusada. Você pode buscar outro serviceiro." |
| Booking completed | `Reserva concluída — avalie {serviceiroName}` | "Sua reserva com {serviceiroName} foi concluída! Deixe uma avaliação." |
| Booking cancelled | `Reserva cancelada por {cancellerName}` | "A reserva de {serviceType} foi cancelada por {cancellerName}." |

### Route integration

**`POST /api/bookings`** — the route currently selects only `role` from the customer profile. Change the select to also include `display_name`:

```typescript
// Change from:
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

// Change to:
const { data: profile } = await supabase
  .from('profiles')
  .select('role, display_name')
  .eq('id', user.id)
  .single()
```

Then after the successful INSERT, add (before the return):
```typescript
sendBookingCreated({
  bookingId: booking.id,
  serviceiroId,
  customerName: profile.display_name,
  serviceType: service_type,
})
// No .catch() needed — sendBookingCreated never throws
```

**`PATCH /api/bookings/[id]`** — the route currently only fetches the booking row. Before the existing switch statement, add a profiles fetch to get both display names.

> Note: The `profiles` table has a public-read RLS policy (`SELECT USING (NOT is_banned)`), so the RLS-bound `supabase` client can read both participants' profiles safely.

```typescript
// Add BEFORE the switch statement (after body parse):
const { data: participantProfiles } = await supabase
  .from('profiles')
  .select('id, display_name')
  .in('id', [booking.customer_id, booking.serviceiro_id])

const customerName = participantProfiles?.find(p => p.id === booking.customer_id)?.display_name ?? 'Cliente'
const serviceiroName = participantProfiles?.find(p => p.id === booking.serviceiro_id)?.display_name ?? 'Serviceiro'
```

Then add email calls inside the switch, after each `update` object is set but before the `break`. Email calls go INSIDE each case block (not after the switch) so that variables like `willBothComplete` remain in scope:

```typescript
case 'accept':
  update = { status: 'active' }
  sendBookingAccepted({ bookingId: params.id, customerId: booking.customer_id, serviceiroName, serviceType: booking.service_type })
  break

case 'decline':
  update = { status: 'declined' }
  sendBookingDeclined({ bookingId: params.id, customerId: booking.customer_id, serviceiroName, serviceType: booking.service_type })
  break

case 'cancel': {
  // Note: add braces { } around this case body if not already present
  update = { status: 'cancelled' }
  const recipientId = isCustomer ? booking.serviceiro_id : booking.customer_id
  const cancellerName = isCustomer ? customerName : serviceiroName
  sendBookingCancelled({ bookingId: params.id, recipientId, cancellerName, serviceType: booking.service_type })
  break
}

case 'mark_complete': {
  // ... existing willBothComplete logic ...
  if (willBothComplete) {
    update.status = 'completed'
    update.completed_at = new Date().toISOString()
    // Email goes inside this block, before the break
    sendBookingCompleted({ bookingId: params.id, customerId: booking.customer_id, serviceiroName })
    // Note: serviceiro does not receive a completion email — out of scope
  }
  break
}
```

All email functions are called without `await` and without `.catch()` — they are guaranteed to never throw by their internal try/catch.

### New env var: `APP_URL`

Add to `.env.local.example` (no `NEXT_PUBLIC_` prefix — used server-side only in `email.ts`):
```
APP_URL=http://localhost:3000
```
On Vercel, set `APP_URL` to the production URL. Update `email.ts` to use `process.env.APP_URL`.

---

## What is NOT in scope

- Email notifications for messages (too noisy)
- Email unsubscribe flow
- Email delivery tracking
- Retry on failure
- HTML email templates with images/logos
- i18n in emails (emails are always in Portuguese)
