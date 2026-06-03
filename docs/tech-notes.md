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

## Canonical Database State

The production database contract is `supabase/schema.sql` followed by every numbered migration in `supabase/migrations/`, in filename order. `schema.sql` is the base snapshot; migrations 001-009 carry the post-schema features and hardening, including character verification fields, disputes, featured listings, service requests, notifications, contact column lockdown, booking field lockdown, and contract hardening.

Migration `009-contract-hardening.sql` moves booking `status` and `completed_at` transition enforcement to the database layer, tightens serviceiro/review/featured policies, protects verification fields from self-modification, and adds the `api_rate_limits` ledger table.

## Rate Limiting

Implemented in `api-helpers.ts` via two patterns:

```typescript
checkRateLimit(supabase, table, userIdColumn, userId, windowMs, maxRequests)
checkActionRateLimit(userId, action, windowMs, maxRequests)
```

`checkRateLimit()` queries the target domain table for rows matching the user within the time window. `checkActionRateLimit()` writes to the `api_rate_limits` ledger from migration 009 and is used when the route needs throttling before a durable domain row exists.

Current limits:
- Bookings: 3 per minute
- Messages: 10 per minute
- Service requests: 3 per minute
- Identity verification uploads: 3 per hour
- TibiaData character verification attempts: 5 per 10 minutes

Both approaches are database-backed, so they survive server restarts and work across multiple instances. The trade-off is an extra query per protected request.

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
- Path format: `{userId}/screenshot-{uuid}.{ext}` and `{userId}/id-{uuid}.{ext}`
- Upload path: `POST /api/verification` receives the files as form data and uploads them server-side with the admin Supabase client. The browser does not write directly to Storage.
- Database values: `verification_requests.screenshot_url` and `id_document_url` store private storage paths, not public URLs.
- Admin review: `/admin/verifications/[id]` creates signed URLs from the private `verifications` bucket for preview; current signed URL TTL is 3600 seconds.

The bucket must remain private. Public access should not be enabled for identity documents.

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

Invalid transitions are blocked in both the API route (`/api/bookings/[id]`) and the database trigger added by migration `009-contract-hardening.sql`. The trigger also keeps service type immutable, blocks post-final-state participant updates, keeps owner confirmation flags monotonic, and prevents status transitions from smuggling unrelated field changes. Dispute open/resolve transitions use atomic database functions so the `disputes` row and related booking status move together.

### Dual Confirmation Pattern

Three actions require both parties to confirm:

1. **Price:** one proposes `agreed_price_tc`, both set `price_confirmed_by_*` = true
2. **Payment:** customer sets `payment_sent_by_customer`, serviceiro sets `payment_received_by_serviceiro`
3. **Completion:** both set `complete_by_*` = true. When both are true, status moves to `completed` and `completed_at` is set.

If one party changes the proposed price, both confirmation flags reset.

## Action Rate Limiting

Routes that do not naturally create a domain row use `checkActionRateLimit()`. The helper calls the `check_api_action_rate_limit()` RPC from migration `009-contract-hardening.sql`, which serializes each `(user_id, action)` check with a transaction advisory lock, records the accepted attempt in the same transaction, and fails closed if the RPC errors.

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

## Production Admin Bootstrap

Production keeps Supabase email confirmation enabled. Bootstrap the first admin by confirming the account email, copying the user's `auth.users.id`, and updating `profiles.role` for that verified UUID only. Do not promote by email-only SQL; a verified user ID prevents accidental promotion of the wrong account if emails change or duplicate setup data exists.

## Contact Info Reveal

WhatsApp and Discord are stored in `profiles` but excluded from public reads. The `/api/contact/[id]` endpoint only returns contact info if:

1. The requester is authenticated
2. The requester has an active booking with the target serviceiro

This prevents non-customers from scraping contact information.
