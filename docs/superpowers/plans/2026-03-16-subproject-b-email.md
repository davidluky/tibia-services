# Sub-project B: Email Notifications — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send transactional emails (via Resend) to booking participants when booking status changes: created, accepted, declined, completed, cancelled.

**Architecture:** A shared `src/lib/email.ts` module exports 5 fire-and-forget email functions (they never throw). The existing booking API routes call these functions after successful DB writes. Recipient emails are fetched from `auth.users` via the admin client.

**Tech Stack:** Next.js 14 App Router, TypeScript, Resend (`resend` npm package), Supabase admin client.

---

## Chunk 1: Setup and Email Module

### Task 1: Install Resend and add env vars

**Files:**
- Modify: `.env.local.example`
- Modify: `.env.local` (user's actual file — add keys but leave values empty as placeholders)

- [ ] **Step 1: Install resend**

```bash
npm install resend
```

Expected output: `added 1 package` (or similar). No errors.

- [ ] **Step 2: Update `.env.local.example`**

Replace the file content with:

```
# Copy this file to .env.local and fill in your values
# Get these from: Supabase Dashboard → Project Settings → API

NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Resend (email provider) — get your API key at resend.com
# For local testing, use: from = onboarding@resend.dev (no domain verification needed)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com

# The base URL of the app — used in email links
# On Vercel, set this to your production URL (e.g. https://tibia-services.com)
APP_URL=http://localhost:3000
```

- [ ] **Step 3: Add the three new keys to `.env.local`** (the user's real file, with placeholder values)

Open `.env.local` and append:
```
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
APP_URL=http://localhost:3000
```

- [ ] **Step 4: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 5: Commit**

```bash
git add .env.local.example package.json package-lock.json
git commit -m "feat(email): install resend, add env vars"
```

---

### Task 2: Create `src/lib/email.ts`

**Files:**
- Create: `src/lib/email.ts`

This file contains the Resend client, the internal `getEmail` helper, and the 5 public send functions.

- [ ] **Step 1: Create the file**

Create `src/lib/email.ts` with this exact content:

```typescript
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@tibia-services.com'
const BASE_URL = process.env.APP_URL ?? 'http://localhost:3000'

async function getEmail(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.auth.admin.getUserById(userId)
    return data.user?.email ?? null
  } catch {
    return null
  }
}

function bookingLink(bookingId: string): string {
  return `${BASE_URL}/bookings/${bookingId}`
}

function emailHtml(title: string, body: string, bookingId: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">
        <tr>
          <td style="background:#1a1a2e;padding:20px 32px">
            <span style="color:#d4af37;font-size:18px;font-weight:bold">Tibia Services</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px">${title}</h2>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">${body}</p>
            <a href="${bookingLink(bookingId)}"
               style="display:inline-block;background:#d4af37;color:#1a1a2e;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
              Ver Reserva
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #eee">
            <p style="margin:0;color:#999;font-size:12px">
              Tibia Services — você recebeu este email porque tem uma reserva ativa.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Public send functions (never throw) ──────────────────────────────────────

export async function sendBookingCreated(opts: {
  bookingId: string
  serviceiroId: string
  customerName: string
  serviceType: string
}): Promise<void> {
  try {
    const to = await getEmail(opts.serviceiroId)
    if (!to) return
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Nova reserva de ${opts.customerName}`,
      html: emailHtml(
        `Nova reserva de ${opts.customerName}`,
        `Você recebeu uma nova reserva para <strong>${opts.serviceType}</strong>. Acesse para aceitar ou recusar.`,
        opts.bookingId,
      ),
    })
  } catch (err) {
    console.error('[email] sendBookingCreated failed:', err)
  }
}

export async function sendBookingAccepted(opts: {
  bookingId: string
  customerId: string
  serviceiroName: string
  serviceType: string
}): Promise<void> {
  try {
    const to = await getEmail(opts.customerId)
    if (!to) return
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${opts.serviceiroName} aceitou sua reserva`,
      html: emailHtml(
        `${opts.serviceiroName} aceitou sua reserva`,
        `Sua reserva de <strong>${opts.serviceType}</strong> foi aceita. Acesse para combinar os detalhes e o preço.`,
        opts.bookingId,
      ),
    })
  } catch (err) {
    console.error('[email] sendBookingAccepted failed:', err)
  }
}

export async function sendBookingDeclined(opts: {
  bookingId: string
  customerId: string
  serviceiroName: string
  serviceType: string
}): Promise<void> {
  try {
    const to = await getEmail(opts.customerId)
    if (!to) return
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${opts.serviceiroName} recusou sua reserva`,
      html: emailHtml(
        `${opts.serviceiroName} recusou sua reserva`,
        `Sua reserva de <strong>${opts.serviceType}</strong> foi recusada. Você pode buscar outro serviceiro.`,
        opts.bookingId,
      ),
    })
  } catch (err) {
    console.error('[email] sendBookingDeclined failed:', err)
  }
}

export async function sendBookingCompleted(opts: {
  bookingId: string
  customerId: string
  serviceiroName: string
}): Promise<void> {
  try {
    const to = await getEmail(opts.customerId)
    if (!to) return
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Reserva concluída — avalie ${opts.serviceiroName}`,
      html: emailHtml(
        `Reserva concluída!`,
        `Sua reserva com <strong>${opts.serviceiroName}</strong> foi concluída com sucesso! Não esqueça de deixar uma avaliação.`,
        opts.bookingId,
      ),
    })
  } catch (err) {
    console.error('[email] sendBookingCompleted failed:', err)
  }
}

export async function sendBookingCancelled(opts: {
  bookingId: string
  recipientId: string
  cancellerName: string
  serviceType: string
}): Promise<void> {
  try {
    const to = await getEmail(opts.recipientId)
    if (!to) return
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Reserva cancelada por ${opts.cancellerName}`,
      html: emailHtml(
        `Reserva cancelada`,
        `A reserva de <strong>${opts.serviceType}</strong> foi cancelada por <strong>${opts.cancellerName}</strong>.`,
        opts.bookingId,
      ),
    })
  } catch (err) {
    console.error('[email] sendBookingCancelled failed:', err)
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat(email): add email module with 5 booking notification functions"
```

---

## Chunk 2: Route Integration

### Task 3: Update `POST /api/bookings` to send booking-created email

**Files:**
- Modify: `src/app/api/bookings/route.ts`

The route currently selects only `role` from the customer's profile. We need `display_name` too.

- [ ] **Step 1: Update the profile select query**

In `src/app/api/bookings/route.ts`, find this line (around line 33):
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()
```

Change to:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('role, display_name')
  .eq('id', user.id)
  .single()
```

- [ ] **Step 2: Add the email call after the successful INSERT**

Find this block near the end of the route (around line 64):
```typescript
  if (error) {
    return NextResponse.json({ error: 'Erro ao criar reserva.' }, { status: 500 })
  }

  return NextResponse.json({ id: booking.id }, { status: 201 })
```

Replace with:
```typescript
  if (error) {
    return NextResponse.json({ error: 'Erro ao criar reserva.' }, { status: 500 })
  }

  sendBookingCreated({
    bookingId: booking.id,
    serviceiroId,
    customerName: profile.display_name,
    serviceType: service_type,
  })

  return NextResponse.json({ id: booking.id }, { status: 201 })
```

- [ ] **Step 3: Add the import at the top of the file**

Add after the existing imports:
```typescript
import { sendBookingCreated } from '@/lib/email'
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/bookings/route.ts
git commit -m "feat(email): send booking-created email to serviceiro on booking creation"
```

---

### Task 4: Update `PATCH /api/bookings/[id]` to send status-change emails

**Files:**
- Modify: `src/app/api/bookings/[id]/route.ts`

- [ ] **Step 1: Add the email import**

Add after the existing imports at the top:
```typescript
import {
  sendBookingAccepted,
  sendBookingDeclined,
  sendBookingCompleted,
  sendBookingCancelled,
} from '@/lib/email'
```

- [ ] **Step 2: Fetch both participant display names before the switch**

In the PATCH handler, find the line where `body` is parsed (around line 66):
```typescript
  const body = await request.json()
  const { action, price_tc } = body
```

Add after body parsing, before the `let update` declaration:
```typescript
  // Fetch display names for both participants (profiles are publicly readable)
  const { data: participantProfiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', [booking.customer_id, booking.serviceiro_id])

  const customerName = participantProfiles?.find(p => p.id === booking.customer_id)?.display_name ?? 'Cliente'
  const serviceiroName = participantProfiles?.find(p => p.id === booking.serviceiro_id)?.display_name ?? 'Serviceiro'
```

- [ ] **Step 3: Add email calls inside the switch cases**

In the switch statement, update the `accept`, `decline`, `cancel`, and `mark_complete` cases. Here is the full updated switch block — replace the entire existing switch with this:

```typescript
  switch (action) {
    case 'accept':
      if (!isServiceiro) return NextResponse.json({ error: 'Somente o serviceiro pode aceitar.' }, { status: 403 })
      if (booking.status !== 'pending') return NextResponse.json({ error: 'Reserva não está pendente.' }, { status: 400 })
      update = { status: 'active' }
      sendBookingAccepted({ bookingId: params.id, customerId: booking.customer_id, serviceiroName, serviceType: booking.service_type })
      break

    case 'decline':
      if (!isServiceiro) return NextResponse.json({ error: 'Somente o serviceiro pode recusar.' }, { status: 403 })
      if (booking.status !== 'pending') return NextResponse.json({ error: 'Reserva não está pendente.' }, { status: 400 })
      update = { status: 'declined' }
      sendBookingDeclined({ bookingId: params.id, customerId: booking.customer_id, serviceiroName, serviceType: booking.service_type })
      break

    case 'cancel': {
      if (booking.status !== 'active' && booking.status !== 'pending') {
        return NextResponse.json({ error: 'Não é possível cancelar esta reserva.' }, { status: 400 })
      }
      update = { status: 'cancelled' }
      const recipientId = isCustomer ? booking.serviceiro_id : booking.customer_id
      const cancellerName = isCustomer ? customerName : serviceiroName
      sendBookingCancelled({ bookingId: params.id, recipientId, cancellerName, serviceType: booking.service_type })
      break
    }

    case 'set_price':
      if (!price_tc || !isValidTC(price_tc)) {
        return NextResponse.json({ error: 'Preço inválido. Deve ser múltiplo de 25 TC.' }, { status: 400 })
      }
      if (booking.status !== 'active') return NextResponse.json({ error: 'Reserva não está ativa.' }, { status: 400 })
      update = {
        agreed_price_tc: price_tc,
        price_confirmed_by_customer: isCustomer,
        price_confirmed_by_serviceiro: isServiceiro,
      }
      break

    case 'confirm_price':
      if (booking.status !== 'active') return NextResponse.json({ error: 'Reserva não está ativa.' }, { status: 400 })
      if (!booking.agreed_price_tc) return NextResponse.json({ error: 'Preço ainda não definido.' }, { status: 400 })
      if (isCustomer) update = { price_confirmed_by_customer: true }
      else update = { price_confirmed_by_serviceiro: true }
      break

    case 'payment_sent':
      if (!isCustomer) return NextResponse.json({ error: 'Somente o cliente pode confirmar pagamento.' }, { status: 403 })
      update = { payment_sent_by_customer: true }
      break

    case 'payment_received':
      if (!isServiceiro) return NextResponse.json({ error: 'Somente o serviceiro pode confirmar recebimento.' }, { status: 403 })
      update = { payment_received_by_serviceiro: true }
      break

    case 'mark_complete': {
      if (booking.status !== 'active') return NextResponse.json({ error: 'Reserva não está ativa.' }, { status: 400 })
      if (isCustomer) update = { complete_by_customer: true }
      else update = { complete_by_serviceiro: true }

      const willBothComplete =
        (isCustomer && booking.complete_by_serviceiro) ||
        (isServiceiro && booking.complete_by_customer)

      if (willBothComplete) {
        update.status = 'completed'
        update.completed_at = new Date().toISOString()
        sendBookingCompleted({ bookingId: params.id, customerId: booking.customer_id, serviceiroName })
      }
      break
    }

    default:
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  }
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/bookings/[id]/route.ts
git commit -m "feat(email): send emails on booking accept/decline/cancel/complete"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run TypeScript check one final time**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 2: Start dev server and manually smoke-test**

```bash
npm run dev
```

To test emails locally:
1. Sign in as a customer and create a booking — the serviceiro should receive an email
2. Sign in as the serviceiro and accept the booking — the customer should receive an email
3. Either party cancels — the other receives an email
4. If no Resend API key yet: confirm the server logs show `[email] sendBooking* failed` with a meaningful error (not a crash)

> Tip: The Resend dashboard at resend.com shows sent emails and delivery status once you add a real API key.

- [ ] **Step 3: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(email): final adjustments after smoke test"
```
