# Flight Recorder — tibia-services

## 2026-06-02 session

Chronological log of observations, commands, and actions for the portfolio quality pass. All work offline; no live Supabase/Resend/TibiaData calls; nothing committed or deployed.

### Assess

1. Read `README.md`, `package.json`, `CLAUDE.md`. Identified stack: Next.js 15 (App Router) + Supabase (Postgres/Auth/Storage/RLS) + TypeScript + Tailwind + Jest, deployed via OpenNext to Cloudflare Workers. 109 TS/TSX files, 19 API routes, 8 test suites.
2. Mapped the source tree: `src/app` (pages + `api/*` routes), `src/components`, `src/lib` (api-helpers, utils, constants, types, email, i18n, supabase clients), `src/__tests__`, `supabase/` (schema.sql + migrations 001–009).
3. `node_modules` absent → ran `npm install` in background. Result: **exit 0**, 999 packages, 5 moderate vulns flagged.

### Read core endpoints (mission focus: booking/chat/review/verification)

- `lib/api-helpers.ts`, `lib/utils.ts`, `lib/env.ts`, `lib/constants.ts`, `lib/types.ts` — standardized responses, auth helpers (`getAuthUser`, `requireAdmin`), two rate-limit strategies, TC validation, `sanitizeText`, placeholder-rejecting env loader.
- All 19 routes under `src/app/api/**`: bookings (POST + GET/PATCH state machine), messages (participant + active-booking gated, sanitized, rate-limited), reviews (completed-booking + customer gated, unique-per-booking), verify-character (HMAC code + TibiaData), verification upload (MIME + size + content-length gated), contact (active/completed-booking gated), disputes/featured/service-requests/notifications/analytics, and all 5 admin routes (`requireAdmin` everywhere).
- `supabase/schema.sql` and `migrations/009-contract-hardening.sql` — RLS + triggers + SECURITY DEFINER RPCs enforcing booking state machine, price/confirmation rules, review/featured constraints, atomic dispute transitions, and an atomic rate-limit ledger.
- `components/booking/BookingThread.tsx`, `app/bookings/page.tsx`, `app/auth/register/page.tsx`, `lib/email.ts`, `lib/i18n-server.ts` to understand the client/state-machine and i18n.

### Health checks (commands + results)

- `npm run typecheck` → **pass**, zero errors.
- `npm run lint` (eslint, `--max-warnings=0`) → **pass**, zero warnings.
- `npx jest --runInBand` → **pass**, 8 suites / 63 tests.
- `npm run build` (with placeholder env to guarantee no live calls) → **pass**, compiled + 32 routes generated.
- `npm run audit` → 5 moderate (all Cloudflare toolchain: wrangler/miniflare/ws + qs).

Starting health: excellent. Treated as a polish pass.

### Investigate & fix

1. Traced the booking `set_price` / `confirm_price` paths against the migration-009 trigger. Found a **real 500 bug**: re-proposing the *same* price after the counterparty confirmed makes the route try to unset that confirmation, which the trigger forbids (`Cannot unset price_confirmed_by_customer/serviceiro`).
   - Added pure helper `priceConfirmationUpdate()` to `src/lib/utils.ts` (clears counterparty confirmation only when the price changes; proposer always auto-confirms).
   - Rewrote the `set_price` branch in `src/app/api/bookings/[id]/route.ts` to use it; added the import.
   - Added `src/__tests__/price-confirmation.test.ts` (5 cases incl. the regression).
2. Verified API verbs vs docs by listing every `export async function (GET|POST|PATCH|DELETE)` per route. Found two stale rows in `CLAUDE.md`:
   - `/api/featured/[id]` documented as `PATCH` but route + client use `DELETE`. Fixed.
   - `/api/bookings` documented as `GET/POST` but route is `POST`-only (list is read server-side in `bookings/page.tsx`). Fixed.
3. Confirmed `bookings/page.tsx` renders all 7 statuses (incl. disputed/resolved) — no missing-status bug.

### Re-verify after changes (commands + results)

- `npm run typecheck` → **pass**.
- `npm run lint` → **pass**.
- `npx jest --runInBand` → **pass**, 9 suites / **68 tests** (+5).
- `npm run build` (placeholder env) → **pass**, `✓ Compiled successfully`, 32/32 static pages generated.

### Deliberate non-changes

- `mark_complete` dual-confirmation race → P1 (needs an atomic RPC + new migration; unverifiable offline).
- No uniqueness on `tibia_character` → P2 (behavior-changing).
- `bookings/page.tsx` hardcoded PT → P2 (cosmetic, pre-existing).
- 5 moderate audit findings (Cloudflare toolchain) → P2 (audit fix risks a wrangler major).
- `character_name` not sanitized in verification upload → P2 (low impact; admin-only render).

### Secrets

- `.env.local` (lines 4–6) holds a live Supabase URL, anon key, and **service-role key**. Not printed beyond the reference in RECOMMENDATIONS; no live calls made. Not a git repo and `.gitignore` excludes `.env*`, so not committed. Flagged in `docs/RECOMMENDATIONS.md` for rotation/secret-manager use.

### Files changed

- `src/app/api/bookings/[id]/route.ts` — `set_price` confirmation logic via helper + import.
- `src/lib/utils.ts` — new pure `priceConfirmationUpdate()` helper.
- `src/__tests__/price-confirmation.test.ts` — new (5 tests).
- `CLAUDE.md` — corrected `/api/featured/[id]` (DELETE) and `/api/bookings` (POST-only) doc rows.
- `docs/RETRO.md` — appended 2026-06-02 session.
- `docs/RECOMMENDATIONS.md` — new.
- `FLIGHT_RECORDER.md` — this file.

### Final state

Offline gate fully green: typecheck ✓, lint ✓, 68/68 tests ✓, production build ✓. One real booking-flow bug fixed with a regression test; two doc inaccuracies corrected. Remaining items are documented and prioritized in `docs/RECOMMENDATIONS.md`. No commits, no deploys, no live external calls.
