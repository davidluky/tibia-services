# Project Functionality

Project: `tibia-services`

Updated: 2026-05-10

This document explains behavior found in the recovered local source, project docs, tests, and recovery audit records. It does not claim manual production validation, live Supabase data validation, live Resend delivery, security review, or server deployment completion.

## Purpose

`tibia-services` is a marketplace web app for Tibia game services. It connects customers with verified serviceiros for services such as hunting, quests, bestiary, and other Tibia activities.

## Main Capabilities

- Browse serviceiros with filters for vocation, gameplay type, weekday, and name.
- View public serviceiro profiles with availability, reviews, and gated contact behavior.
- Register and log in users through Supabase Auth.
- Support three roles: `customer`, `serviceiro`, and `admin`.
- Let customers create booking requests.
- Let serviceiros accept, decline, negotiate price, track payment, and complete bookings.
- Provide in-booking chat between customer and serviceiro.
- Let customers leave 1-5 star reviews after completed bookings.
- Verify serviceiro Tibia character ownership with TibiaData API v4 and deterministic verification codes.
- Let serviceiros submit identity verification uploads for admin review.
- Gate WhatsApp/Discord contact info behind an active booking.
- Support featured listings paid in Tibia Coins.
- Support customer-created service requests and serviceiro applications.
- Provide admin pages for users, verification review, disputes, featured listings, and review moderation.
- Provide analytics/KPI pages for serviceiros.
- Send booking-status email notifications through Resend.
- Support Portuguese, English, and Spanish UI translations.

## User Flows

Marketplace browsing:

1. User opens `/browse`.
2. The app lists serviceiros and filter controls.
3. User opens `/serviceiro/[id]` to inspect a serviceiro profile.
4. Contact information is revealed only through `/api/contact/[id]` when the requester has an active booking.

Authentication:

1. User opens `/auth/register` or `/auth/login`.
2. Supabase Auth creates or restores the session.
3. Register stores role/display-name metadata.
4. Database trigger `handle_new_user()` creates a `profiles` row and, for serviceiros, a `serviceiro_profiles` row.

Booking:

1. Customer creates a booking.
2. Booking starts as `pending`.
3. Serviceiro accepts to move it to `active` or declines to move it to `declined`.
4. While active, both parties can chat and confirm price, payment, and completion.
5. Both parties must mark complete before the booking becomes `completed`.
6. Customer can open a dispute while active.
7. Admin can resolve disputed bookings.

Service requests:

1. Customer opens `/servicos` or `/servicos/novo`.
2. Customer posts a service request.
3. Serviceiros can apply through `/api/service-requests/[id]/apply`.

Verification:

1. Serviceiro opens dashboard verification.
2. `GET /api/verify-character` returns a deterministic `TIBS-XXXXXXXX` code.
3. Serviceiro places the code in the Tibia.com character comment.
4. `POST /api/verify-character` checks TibiaData API v4 and updates verification fields on match.
5. Identity verification uploads go through `POST /api/verification` and are reviewed by admin pages.

## Commands And Interfaces

Package scripts found in `package.json`:

- `npm run dev`: starts the local Next.js dev server.
- `npm run build`: builds the production Next.js app.
- `npm run package`: builds and adapts the app for Cloudflare Workers through OpenNext.
- `npm start`: serves a completed production build.
- `npm run lint`: runs ESLint with `--max-warnings=0`.
- `npm run typecheck`: runs TypeScript with `--noEmit`.
- `npm test`: runs Jest.
- `npm test -- --runInBand`: runs Jest serially.
- `npm run audit`: runs `npm audit --audit-level=moderate`.
- `npm run quality`: runs lint, typecheck, tests, build, and audit in sequence.
- `npm run test:resend -- --to recipient@example.com`: sends one controlled Resend smoke email after a real non-placeholder `RESEND_API_KEY` is configured. Use `--dry-run` to check command wiring without sending.

User-facing routes found in `src/app`:

- `/`
- `/browse`
- `/serviceiro/[id]`
- `/auth/login`
- `/auth/register`
- `/bookings`
- `/bookings/[id]`
- `/dashboard`
- `/dashboard/analytics`
- `/dashboard/verification`
- `/servicos`
- `/servicos/novo`
- `/admin`
- `/admin/users`
- `/admin/verifications`
- `/admin/verifications/[id]`
- `/admin/reviews`
- `/admin/disputes`
- `/admin/featured`
- `/privacidade`
- `/termos`

API route files found under `src/app/api`:

- `/api/admin/ban/[id]`
- `/api/admin/disputes/[id]`
- `/api/admin/featured/[id]`
- `/api/admin/review/[id]`
- `/api/admin/verify/[id]`
- `/api/analytics`
- `/api/bookings`
- `/api/bookings/[id]`
- `/api/contact/[id]`
- `/api/disputes`
- `/api/featured`
- `/api/featured/[id]`
- `/api/messages`
- `/api/notifications`
- `/api/reviews`
- `/api/service-requests`
- `/api/service-requests/[id]/apply`
- `/api/verification`
- `/api/verify-character`

## Data And Storage

Primary storage:

- Supabase PostgreSQL for marketplace tables.
- Supabase Auth for user sessions and auth users.
- Supabase Storage private `verifications` bucket for screenshot and ID-document uploads.

Database contract:

- `supabase/schema.sql` is the base schema snapshot.
- `supabase/migrations/001-009` add character verification, disputes, featured listings, service requests, notifications, contact/booking field lockdown, and contract hardening.
- The docs record 11 tables plus 1 view.
- The `serviceiro_completion_counts` view aggregates completed bookings per serviceiro/gameplay type.

Important tables/domains described in project docs:

- profiles
- serviceiro_profiles
- bookings
- messages
- reviews
- disputes
- featured listings
- service requests
- notifications
- verification requests
- api rate limits

Generated/local folders present in the recovered workspace include `.next`, `.open-next`, `.swc`, `.vercel`, `node_modules`, and `tsconfig.tsbuildinfo`. These are generated or deployment/cache artifacts, not source functionality.

## Configuration

Environment variables listed in `.env.local.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_TEST_TO` is supported by the local smoke script as an optional test recipient value.
- `APP_URL`
- `CHAR_VERIFY_SECRET`

`src/lib/env.ts` rejects missing placeholder values for server-only runtime paths. It treats placeholder values such as `your-anon-public-key-here`, `your-service-role-key-here`, `re_your_api_key_here`, and `your-random-secret-here` as invalid.

A local `.env.local` file exists in the recovered workspace, but its values were not printed into audit notes. `git ls-files -- .env.local .env.local.example` showed `.env.local.example` as tracked and did not list `.env.local`.

## Runtime Behavior

- Next.js App Router provides pages, server components, client components, and API routes.
- Supabase SSR cookies persist user sessions across server and client rendering.
- Three Supabase client types are documented:
  - browser client with anon key and RLS
  - server client with anon key, cookies, and RLS
  - admin client with service-role key, server-only, bypassing RLS
- API routes use helpers from `src/lib/api-helpers.ts` for auth, admin checks, JSON parsing, rate limiting, and standardized error responses.
- Database-backed rate limits protect bookings, messages, service requests, identity verification uploads, and TibiaData verification attempts.
- Booking transition rules are enforced in both API code and database migration `009-contract-hardening.sql`.
- In-booking messages use Supabase Realtime with initial fetch.
- Email notifications are sent through `src/lib/email.ts`; send functions are fire-and-forget and log failures rather than throwing.
- Language state is stored in React context, persisted in `localStorage`, and mirrored to the `tibia_lang` cookie.
- Admin access is protected by server-side role checks.

## Verification Performed

- Recovery audit included this project in `project-audit.csv` and `verification-results.csv`.
- Git fsck result was recorded as `ok`.
- Dependency repair recorded one passing npm/pnpm row.
- Stale generated `.next` cache was moved out during recovery.
- Automated verification passed with command `npm run quality`.
- Recorded `npm run quality` sequence:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test -- --runInBand`
  - `npm run build`
  - `npm run audit`
- Recorded Jest result: 8 test suites passed, 63 tests passed, 0 snapshots.
- Recorded Next build result: compiled successfully and generated 32 static pages.
- Recorded npm audit result: found 0 vulnerabilities.
- Latest tracked text null-byte scan had no remaining finding for this project.
- On 2026-05-09, a live Supabase/Resend safety review checked local `.env.local` by variable name/status and static shape without printing secret values. Resend remained blocked by a placeholder API key. A bounded anon Supabase probe was inconclusive and no writes were performed. No service-role metadata read was run because it bypasses RLS.
- On 2026-05-09, a safe gates refresh reran `npm.cmd run quality`. The first rerun passed lint, typecheck, Jest, and Next build, but failed audit on one high-severity transitive `fast-xml-builder` finding.
- On 2026-05-09, non-force `npm.cmd audit fix` exited `0`; `package-lock.json` moved `fast-xml-builder` from `1.1.5` to `1.2.0` and added `xml-naming@0.1.0`; `package.json` was not changed.
- On 2026-05-09, follow-up `npm.cmd run quality` exited `0`: lint, typecheck, Jest 8 suites / 63 tests, Next build, and audit with 0 vulnerabilities.
- On 2026-05-09, `GET /auth/v1/settings` with the anon/publishable Supabase key returned HTTP `200`, showing the recovered URL/key can reach the Supabase auth service.
- On 2026-05-09, anon/publishable `limit=0` REST probes returned HTTP `404` for the expected app tables, so live database/schema validation is still not claimed.
- Follow-up read-only inspection found `docs\MIGRATION-STEPS.md` marks the database schema/migrations as pending and instructs applying `supabase\schema.sql` followed by numbered migrations `001` through `009`.
- Follow-up read-only inspection confirmed the repo contains the base schema plus migrations for the tables and functions the runtime code expects, but no SQL was applied to Supabase during recovery.
- `Get-Command supabase` found no Supabase CLI on PATH in this shell.
- On 2026-05-10, David's Supabase SQL table-existence check showed all expected app tables exist, including `notifications` and `api_rate_limits`.
- On 2026-05-10, David's Supabase grant check showed broad table-level privileges for `anon`, `authenticated`, and `service_role` on the expected app tables.
- On 2026-05-10, Codex's initial owner-progress REST/Data API recheck used safe anon `limit=0` probes without printing row data or secrets; that initial recheck returned HTTP `404` with code `PGRST205` for all expected app tables.
- On 2026-05-10, Codex opened the Supabase Data API settings URL in Chrome but could not attach to the authenticated Chrome tab from this running thread; no dashboard setting was changed by Codex.
- On 2026-05-10, Codex reran corrected safe anon REST/Data API `limit=0` probes without printing row data or secrets; all expected app tables were reachable. `api_rate_limits`, `bookings`, `disputes`, `featured_listings`, `messages`, `notifications`, and `verification_requests` returned HTTP `200`; `profiles`, `reviews`, `service_requests`, and `serviceiro_profiles` returned HTTP `206`.
- On 2026-05-10, Codex ran a bounded disposable auth/app-flow check: local Next dev server on `http://127.0.0.1:3374`, one confirmed disposable customer user created through Supabase admin API, login through `/auth/login` in headless Chrome/Playwright, authenticated `/dashboard`, `/bookings`, and `/servicos/novo` loads, authenticated own-profile read confirming role `customer`, disposable user deletion, and local server shutdown.
- On 2026-05-10, the first disposable auth/app-flow run exposed Next 15 runtime errors from synchronous server-side `cookies()` access in `src\lib\supabase\server.ts`; the server Supabase client was repaired to await `cookies()`, use `getAll`/`setAll`, and all server-side callers were updated to `await createClient()`.
- On 2026-05-10, post-repair `npm.cmd run quality` exited `0`: ESLint, TypeScript, Jest 8 suites / 63 tests, Next build, and npm audit all passed.
- On 2026-05-10, the post-repair disposable auth/app-flow recheck passed again, `/api/notifications` returned HTTP `200`, and the error-log check found no `cookies() should be awaited` / `sync-dynamic-apis` errors.
- On 2026-05-10, Codex added `scripts\resend-smoke.mjs` and `npm run test:resend` as a controlled Resend smoke-test path. `node --check scripts\resend-smoke.mjs` exited `0`; `npm.cmd run test:resend -- --to codex-audit@example.com --dry-run` exited `1` as expected because the current Resend key is missing or placeholder-shaped; no email was sent.
- On 2026-05-10, post-smoke-script `npm.cmd run quality` exited `0`: ESLint, TypeScript, Jest 8 suites / 63 tests, Next build, and npm audit all passed.
- On 2026-05-10, after David provided a Resend key through the local clipboard, Codex wrote the redacted key into ignored `.env.local`, set `RESEND_FROM_EMAIL=onboarding@resend.dev`, and ran `npm.cmd run test:resend -- --to adftbd@gmail.com`. The command exited `0` and Resend returned message id `366224ff-a03c-4009-ae70-cc6f73505aed`.
- On 2026-05-10, post-provider-smoke `npm.cmd run quality` exited `0`: ESLint, TypeScript, Jest 8 suites / 63 tests, Next build, and npm audit all passed.
- On 2026-05-10, Codex repaired `src\lib\email.ts` so Resend `{ error }` returns are checked and successful sends log a message id only. Post-repair `npm.cmd run quality` exited `0`.
- On 2026-05-10, a bounded booking-created app-route attempt exercised `POST /api/bookings`; it returned HTTP `201`, then the repaired email helper logged the expected Resend test-mode failure for a Gmail plus-alias recipient. Test data was cleaned up.
- On 2026-05-10, a bounded booking-accepted app-route email flow exercised `PATCH /api/bookings/[id]` with `{ "action": "accept" }`; it returned HTTP `200`, the app logged `sendBookingAccepted` message id `a0bc1fa8-d2f3-462b-9827-34b3f10b5ce0`, and temporary booking/notification/disposable serviceiro data was cleaned up.

## Deployment Or Operation Notes

- Local setup starts with `npm install`, then copying `.env.local.example` to `.env.local` and filling Supabase/Resend/app secrets.
- `npm run dev` starts the local development server.
- `npm run quality` is documented as the pre-deploy gate and mirrors `.github/workflows/quality.yml`.
- `npm run package` builds for Cloudflare Workers via OpenNext.
- `wrangler.jsonc`, `open-next.config.ts`, `.open-next`, and `.vercel` artifacts/configs exist in the recovered workspace.
- Production deployment must keep `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `CHAR_VERIFY_SECRET` server-side.
- Supabase table existence is owner-confirmed in the target project, and corrected read-only REST/Data API `limit=0` probes now reach the expected app tables.
- Disposable login and authenticated page loads for `/dashboard`, `/bookings`, and `/servicos/novo` are checked with a disposable customer account.
- Server-side Supabase cookie handling is repaired and rechecked against Next 15 local runtime behavior.
- Resend provider/key/sender delivery is checked with `onboarding@resend.dev` to `adftbd@gmail.com`. One real app-triggered booking status email path is checked through `PATCH /api/bookings/[id]` accepting a temporary booking. `POST /api/bookings` route creation returned `201`, but booking-created email delivery to a disposable plus-alias is blocked by Resend test-mode recipient restrictions until a sending domain is verified.
- A copy-only promoted source snapshot exists at `C:\Users\David\OneDrive\Desktop\Programas_funcionando\tibia-services`.
- The promoted snapshot intentionally excludes local secrets and generated/runtime state including `.env`, `.env.local`, `.git`, `.next`, `.open-next`, `.vercel`, `.swc`, `node_modules`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, and `supabase\.temp`.

## Known Limits And Not Claimed

- Manual browser UX review is not claimed.
- Live Supabase auth/project reachability is partially checked, and owner SQL plus corrected read-only REST/Data API probes confirm the expected app tables exist and are reachable.
- Live Supabase app workflows involving signup UI, authenticated writes, RLS policy audit, bookings, messages, admin actions, and production user-facing behavior are not claimed.
- Full production email behavior to arbitrary recipients is not claimed until a sending domain is verified in Resend.
- `.env.local` now contains a real local Resend key supplied through the clipboard; its value was not printed and the file is ignored by Git.
- Production Cloudflare/Vercel deployment validation is not claimed.
- Security review is not claimed, even though security-related design decisions and tests exist.
- Local `.env.local` values were not printed into docs or audit output.
- Generated `.next`, `.open-next`, `.swc`, `.vercel`, and `node_modules` folders should not be treated as recovered source when promoting.

## Evidence Sources

- `README.md`
- `SETUP.md`
- `docs/developer-guide.md`
- `docs/tech-notes.md`
- `docs/design-decisions.md`
- `docs/build-commands.md`
- `package.json`
- `.env.local.example`
- `src/lib/env.ts`
- `src/app`
- `src/app/api`
- `src/lib/api-helpers.ts`
- `src/lib/email.ts`
- `src/lib/supabase`
- `supabase/schema.sql`
- `supabase/migrations`
- `CODEX_RECOVERY_CHECKLIST.md`
- `C:\Users\David\OneDrive\Desktop\Programas\_codex_project_audit_20260506\verification-logs-20260506_193448\tibia-services.stdout.log`
- `C:\Users\David\OneDrive\Desktop\Programas\_codex_project_audit_20260506\verification-logs-20260506_193448\tibia-services.stderr.log`
- `C:\Users\David\OneDrive\Desktop\Programas\_codex_project_audit_20260506\VERIFICATION_RESULTS.md`
- `C:\Users\David\OneDrive\Desktop\Programas\_codex_project_audit_20260506\PROJECT_AUDIT.md`
- `C:\Users\David\OneDrive\Desktop\Programas\_codex_project_audit_20260506\TIBIA_SERVICES_BOOKING_EMAIL_FLOW_20260510.md`
- `C:\Users\David\OneDrive\Desktop\Programas\_codex_project_audit_20260506\TIBIA_SERVICES_PROMOTION_20260510.md`
