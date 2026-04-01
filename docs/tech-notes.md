# Tech Notes

## Supabase Client Types

Three clients serve different contexts:

| Client | File | Key Used | RLS | Use In |
|--------|------|----------|-----|--------|
| Browser | `supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client Components |
| Server | `supabase/server.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` + cookies | Yes | Server Components, API Routes |
| Admin | `supabase/admin.ts` | `SUPABASE_SERVICE_ROLE_KEY` | **No** | API Routes only (admin ops) |

The browser client uses `createBrowserClient()` from `@supabase/ssr`. The server client uses `createServerClient()` with Next.js cookies for session management. The admin client uses the raw `createClient()` from `@supabase/supabase-js` with the service role key.

**Rule:** Never import `admin.ts` in any file that runs in the browser.

## Rate Limiting

Implemented in `api-helpers.ts` via `checkRateLimit()`:

```typescript
checkRateLimit(supabase, table, userIdColumn, userId, windowMs, maxRequests)
```

Queries the target table for rows matching the user within the time window. Returns `true` if the limit is exceeded.

Current limits:
- Bookings: 3 per minute
- Messages: 10 per minute
- Service requests: 3 per minute

This is a database-query-based approach (not in-memory counters), so it survives server restarts and works across multiple instances. The trade-off is an extra query per request.

## Character Verification Flow

Uses TibiaData API v4 (`https://api.tibiadata.com/v4/character/{name}`).

1. Serviceiro visits dashboard, clicks "Verify Character"
2. `GET /api/verify-character` returns a unique verification code: `TIBS-XXXXXXXX`
3. Code is generated via HMAC-SHA256: `HMAC(CHAR_VERIFY_SECRET, userId)` truncated to 8 hex chars
4. Serviceiro places the code in their Tibia.com character comment
5. Serviceiro submits character name via `POST /api/verify-character`
6. Server fetches character data from TibiaData API v4
7. Server checks if the character's comment contains the verification code (case-insensitive)
8. On match: updates `serviceiro_profiles.tibia_character` and `tibia_char_verified = true`

The code is deterministic per user -- same user always gets the same code. This means the user can re-verify without generating a new code.

Validation: character name must be 1-30 chars, letters and spaces only.

## File Upload to Supabase Storage

Used for verification requests (screenshot + ID document).

- Bucket: `verifications` (private)
- MIME validation: only image types accepted
- Size limit: 5MB
- Path format: `{userId}/{filename}`
- Storage URLs constructed in code using Supabase Storage public URL helper

Files are uploaded client-side via the Supabase Storage SDK, then the storage paths are sent to the API route.

## Booking State Machine

```
Status Transitions:
  pending   → active     (serviceiro accepts)
  pending   → declined   (serviceiro declines)
  active    → completed  (both mark complete)
  active    → cancelled  (either party cancels)
  active    → disputed   (customer opens dispute)
  disputed  → resolved   (admin resolves)
```

Invalid transitions are blocked by the API route (`/api/bookings/[id]`).

### Dual Confirmation Pattern

Three actions require both parties to confirm:

1. **Price:** one proposes `agreed_price_tc`, both set `price_confirmed_by_*` = true
2. **Payment:** customer sets `payment_sent_by_customer`, serviceiro sets `payment_received_by_serviceiro`
3. **Completion:** both set `complete_by_*` = true. When both are true, status moves to `completed` and `completed_at` is set.

If one party changes the proposed price, both confirmation flags reset.

## Featured Listings TC Calculation

Featured listings let serviceiros pay TC to boost their profile visibility.

- `tc_amount`: amount of TC paid (multiples of 25)
- `days_requested`: database-generated column = `tc_amount / 25`
- Status flow: `pending` → admin confirms → `active` (sets `confirmed_at` and `expires_at`)
- Client-side timeout: if `requested_at` is >24h ago and still `pending`, shown as timed out
- Active listings: profile appears in the featured section on the landing page

## Email Notifications via Resend

`src/lib/email.ts` sends transactional emails on booking status changes:

| Event | Recipient | Email Subject |
|-------|-----------|---------------|
| Booking created | Serviceiro | "Nova reserva de {customer}" |
| Booking accepted | Customer | "{serviceiro} aceitou sua reserva" |
| Booking declined | Customer | "{serviceiro} recusou sua reserva" |
| Booking completed | Customer | "Reserva concluida -- avalie {serviceiro}" |
| Booking cancelled | Other party | "Reserva cancelada por {canceller}" |

All send functions are fire-and-forget (never throw). Failures are logged to console.

Email is fetched via the admin client's `auth.admin.getUserById()` since email is stored in `auth.users`, not in `profiles`.

## Contact Info Reveal

WhatsApp and Discord are stored in `profiles` but excluded from public reads. The `/api/contact/[id]` endpoint only returns contact info if:

1. The requester is authenticated
2. The requester has an active booking with the target serviceiro

This prevents non-customers from scraping contact information.
