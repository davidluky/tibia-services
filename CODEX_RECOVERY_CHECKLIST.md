# Codex Recovery Checklist

Generated: 2026-05-06 20:13:50 -04:00

Project: `tibia-services`

Historical recovery source path: `C:\Users\David\OneDrive\Desktop\Programas\Programas\tibia-services`

Current promoted path: `C:\Users\David\OneDrive\Desktop\Programas_funcionando\tibia-services`

This checklist is evidence-based. Checked items below come from the audit CSVs, verification logs, or file operations recorded under `C:\Users\David\OneDrive\Desktop\Programas\_codex_project_audit_20260506`. It does not claim a full manual UX, security, or product review.

## Checked Facts

- [x] Included in latest verification matrix: `verification-results.csv`.
- [x] Included in latest project audit: `project-audit.csv`.
- [x] Git repository flag in latest audit: `True`.
- [x] Git fsck result in latest audit: `ok`.
- [x] README present in latest audit: `True`.
- [x] Dirty-tree counts in latest audit: modified `0`, deleted `0`, untracked `1`.
- [x] Automated verification passed with command: `npm run quality`.
- [x] Verification exit code recorded as `0`.
- [x] Verification stdout log recorded at: `C:\Users\David\OneDrive\Desktop\Programas\_codex_project_audit_20260506\verification-logs-20260506_193448\tibia-services.stdout.log`.
- [x] Verification stderr log recorded at: `C:\Users\David\OneDrive\Desktop\Programas\_codex_project_audit_20260506\verification-logs-20260506_193448\tibia-services.stderr.log`.
- [x] Latest tracked text null-byte scan has no remaining finding for this project.

## Supplemental Website-Informed Checks

- [x] No supplemental website-informed check was recorded for this project.

## Recorded Recovery Actions

- [x] Dependency repair log has `1` npm/pnpm row(s), with `1` pass row(s); see `node-dependency-repair-results.csv`.
- [x] Stale generated `.next` cache was moved out during recovery; latest verification passed `npm run quality`.

## 2026-05-07 Functionality Documentation

- [x] Added `PROJECT_FUNCTIONALITY.md` describing the marketplace capabilities, user flows, commands, web/API routes, Supabase data/storage model, configuration, runtime behavior, verification performed, deployment notes, and known limits.
- [x] Confirmed from `package.json` that `npm run quality` runs lint, typecheck, Jest tests, build, and npm audit in sequence.
- [x] Confirmed from recorded verification logs that `npm run quality` exited `0`, Jest reported 8 passed test suites and 63 passed tests, Next build completed, and npm audit found 0 vulnerabilities.
- [x] Confirmed from `.env.local.example` and `src/lib/env.ts` the required environment variable names and placeholder-rejection behavior; no local `.env.local` values were printed into audit notes.
- [x] Confirmed with `git ls-files -- .env.local .env.local.example` that `.env.local.example` is tracked and `.env.local` was not listed as tracked.

## 2026-05-07 Promotion-Readiness Recheck

- [x] Ran `npm.cmd run quality` from the project root; command exited `0`.
- [x] Quality command completed lint, typecheck, Jest tests, Next build, and npm audit.
- [x] Jest reported 8 test suites passed and 63 tests passed.
- [x] Next build completed and reported dynamic/static route output.
- [x] `npm audit --audit-level=moderate` reported 0 vulnerabilities.

## 2026-05-07 Read-Only Public Route Smoke

- [x] Listed local Next.js page routes under `src\app`; public/auth/protected page files include `/`, `/browse`, `/servicos`, `/auth/login`, `/auth/register`, `/dashboard`, `/bookings`, `/servicos/novo`, `/admin`, `/termos`, and `/privacidade`.
- [x] Read-only GET to `https://tibia.davidluky.com/` returned HTTP `200`, title `Tibia Services — Encontre seu Serviceiro`.
- [x] Read-only GET to `https://tibia.davidluky.com/browse` returned HTTP `200`, title `Buscar Serviceiros | Tibia Services`.
- [x] Read-only GET to `https://tibia.davidluky.com/servicos` returned HTTP `200`, title `Pedidos de Serviço | Tibia Services`.
- [x] Read-only GET to `https://tibia.davidluky.com/auth/login` returned HTTP `200`.
- [x] Read-only GET to `https://tibia.davidluky.com/auth/register` returned HTTP `200`.
- [x] Read-only GET to `https://tibia.davidluky.com/termos` returned HTTP `200`, title `Termos de Uso — Tibia Services`.
- [x] Read-only GET to `https://tibia.davidluky.com/privacidade` returned HTTP `200`, title `Política de Privacidade — Tibia Services`.
- [x] Read-only GETs to `/dashboard`, `/bookings`, `/servicos/novo`, and `/admin` returned HTTP `200`; this confirms route reachability only, not authenticated authorization correctness.
- [x] Read-only GET to `/api/featured`, `/api/analytics`, and `/api/notifications` returned HTTP `401`; read-only GET to `/api/service-requests` returned HTTP `405`.
- [x] No Supabase writes, login, booking creation, email sending, admin mutation, or production deployment was performed.

## 2026-05-09 Live Supabase And Resend Safety Review

- [x] David approved bounded live Supabase/Resend testing only if credentials were found safely and real user/customer impact was avoided.
- [x] Confirmed local `.env.local` exists and contains the expected variable names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL`, and `CHAR_VERIFY_SECRET`.
- [x] Secret values were not printed into audit notes.
- [x] Static shape review found Supabase URL present and URL-shaped.
- [x] Static shape review found Supabase anon and service-role keys present but not matching the project's documented `eyJ...` JWT-like shape.
- [x] Static shape review found `RESEND_API_KEY` still set to the placeholder value.
- [x] A bounded anon Supabase REST probe requested no rows and performed no writes, but did not produce a useful HTTP status; live Supabase validation remains inconclusive.
- [x] No service-role live test was performed because it bypasses RLS and risks real user/customer metadata exposure.
- [x] No Resend call was performed because the local API key is a placeholder.
- [x] Confirmed `scripts\seed-production.mjs` is a mutating production seed script and was not run.
- [x] Added central report `TIBIA_SERVICES_LIVE_SAFETY_20260509.md`.

## 2026-05-09 Safe Gates Refresh

- [x] Initial `npm.cmd run quality` passed lint, typecheck, Jest, and Next build, but failed at `npm audit --audit-level=moderate`.
- [x] The audit failure was one high-severity `fast-xml-builder` finding under dependency path `@opennextjs/cloudflare -> @opennextjs/aws -> @aws-sdk/client-cloudfront -> @aws-sdk/core -> @aws-sdk/xml-builder -> fast-xml-parser -> fast-xml-builder`.
- [x] Ran non-force `npm.cmd audit fix`; command exited `0`.
- [x] `package-lock.json` updated `fast-xml-builder` from `1.1.5` to `1.2.0` and added `xml-naming@0.1.0`; `package.json` was not changed.
- [x] Follow-up `npm.cmd run quality` exited `0`.
- [x] Follow-up quality gate completed lint, typecheck, Jest, Next build, and audit.
- [x] Jest reported 8 test suites passed and 63 tests passed.
- [x] Follow-up `npm audit --audit-level=moderate` reported `found 0 vulnerabilities`.
- [x] No Supabase writes, email send, production seed, or production deployment was performed in this refresh.
- [x] Added central report `TIBIA_SAFE_GATES_REFRESH_20260509.md`.

## 2026-05-09 Supabase And Resend Credential Recheck

- [x] Confirmed local `.env.local` still contains the expected Supabase, Resend, app URL, and character verification secret variable names.
- [x] Secret values were not printed into audit notes.
- [x] Static shape review found `NEXT_PUBLIC_SUPABASE_URL` URL-shaped, `NEXT_PUBLIC_SUPABASE_ANON_KEY` shaped like a modern Supabase publishable key, and `SUPABASE_SERVICE_ROLE_KEY` shaped like a modern Supabase secret key.
- [x] `GET /auth/v1/settings` with the anon/publishable key returned HTTP `200`; no response body was printed.
- [x] `GET /auth/v1/settings` with the secret key returned HTTP `401`; this was recorded only as endpoint/key compatibility evidence, not as proof that every server-side Supabase use fails.
- [x] Anon/publishable `limit=0` REST probes performed no writes and printed no row data.
- [x] Anon/publishable `limit=0` REST probes returned HTTP `404` for expected app tables: `profiles`, `serviceiro_profiles`, `bookings`, `messages`, `reviews`, `disputes`, `featured_listings`, `service_requests`, `notifications`, `verification_requests`, and `api_rate_limits`.
- [x] Resend live validation was not attempted because `RESEND_API_KEY` is still placeholder-shaped.
- [x] Added central report `TIBIA_SERVICES_SUPABASE_RESEND_RECHECK_20260509.md`.

## 2026-05-09 Migration/Schema Follow-Up

- [x] Read-only inspection found `docs\MIGRATION-STEPS.md` explicitly says to run `supabase\schema.sql` first and then migrations `001` through `009`; the doc marks the current status as pending.
- [x] Read-only inspection confirmed `supabase\schema.sql` defines the base marketplace tables and `serviceiro_completion_counts` view.
- [x] Read-only inspection confirmed migrations `001` through `009` exist and cover character verification, disputes, featured listings, service requests, notifications, security hardening, contact/booking lockdown, rate limits, and dispute functions.
- [x] Source search confirmed runtime code queries the same app tables that returned HTTP `404` during safe anon REST probes.
- [x] `Get-Command supabase` found no Supabase CLI on PATH in this shell.
- [x] Confirmed the recovered `RESEND_API_KEY` matches a placeholder value rejected by `src\lib\env.ts`.
- [x] No Supabase SQL, seed, write, user metadata read, or Resend email was performed in this follow-up.

## 2026-05-10 Owner-Assisted Supabase Table Progress

- [x] David opened the Supabase dashboard for project ref `lsizuiyxowfbipslkdya`.
- [x] David's SQL table-existence check showed `api_rate_limits`, `bookings`, `disputes`, `featured_listings`, `messages`, `notifications`, `profiles`, `reviews`, `service_requests`, `serviceiro_profiles`, and `verification_requests` all exist.
- [x] David's grant check showed broad table-level privileges for `anon`, `authenticated`, and `service_role` on the expected app tables.
- [x] Codex's initial owner-progress REST/Data API recheck used safe anon `limit=0` probes without printing row data or secrets; that initial recheck returned HTTP `404` with code `PGRST205` for all expected app tables.
- [x] Codex opened the Supabase Data API settings URL in Chrome, but could not attach to the existing Chrome tab from this thread; no dashboard setting was changed by Codex.
- [x] Remaining Supabase blocker is Data API exposure/cache configuration, likely enabling/exposing schema `public` and the expected app tables, then running PostgREST config/schema reload notifications.
- [x] Added central report `TIBIA_SERVICES_SUPABASE_OWNER_PROGRESS_20260510.md`.

## 2026-05-10 Data API Recheck

- [x] Reran corrected safe anon REST/Data API `limit=0` probes without printing row data or secrets.
- [x] `api_rate_limits`, `bookings`, `disputes`, `featured_listings`, `messages`, `notifications`, and `verification_requests` returned HTTP `200`.
- [x] `profiles`, `reviews`, `service_requests`, and `serviceiro_profiles` returned HTTP `206`.
- [x] No expected app table returned `PGRST205` in the corrected recheck.
- [x] Supabase REST/Data API table reachability is now checked for the expected tables using read-only empty-result probes.
- [x] Remaining blockers are a disposable-account browser/app flow and a real approved Resend key/test path.

## 2026-05-10 Disposable Auth Flow

- [x] Started local Next dev server on `http://127.0.0.1:3374`.
- [x] Created one confirmed disposable customer user through the Supabase admin API without printing secret values or the disposable password.
- [x] Logged in through `/auth/login` in a headless Chrome/Playwright browser session.
- [x] Confirmed the browser left `/auth/login` after submit.
- [x] Loaded `/dashboard` as the authenticated disposable user.
- [x] Loaded `/bookings` as the authenticated disposable user and observed the expected empty bookings state.
- [x] Loaded `/servicos/novo` as the authenticated disposable customer and observed the new service-request page/form.
- [x] Performed an authenticated client read of the disposable user's own `profiles` row and confirmed the role was `customer`.
- [x] Deleted the disposable user after the test.
- [x] Stopped the local server listener on port `3374`.
- [x] Saved evidence screenshots under `_codex_project_audit_20260506\tmp\tibia-services-live-flow-20260510`.
- [x] Added central report `TIBIA_SERVICES_DISPOSABLE_AUTH_FLOW_20260510.md`.

## 2026-05-10 Next 15 Cookie Repair And Auth Recheck

- [x] The first disposable auth/app-flow run passed but exposed Next 15 dev runtime errors from synchronous server-side `cookies()` access in `src\lib\supabase\server.ts`.
- [x] Repaired `src\lib\supabase\server.ts` so server Supabase client creation awaits `cookies()`.
- [x] Switched the server Supabase cookie adapter to `getAll`/`setAll`.
- [x] Updated server-side callers of `createClient()` to `await createClient()`.
- [x] Updated `src\lib\api-helpers.ts` helper typing for the now-async server client.
- [x] Post-repair `npm.cmd run quality` exited `0`: ESLint, TypeScript, Jest 8 suites / 63 tests, Next build, and npm audit all passed.
- [x] Post-repair disposable auth/app-flow recheck passed again with one confirmed disposable customer user.
- [x] Post-repair authenticated `/dashboard`, `/bookings`, and `/servicos/novo` page loads passed.
- [x] Post-repair dev server output showed `/api/notifications` returned HTTP `200`.
- [x] Post-repair error-log check found no `cookies() should be awaited` / `sync-dynamic-apis` errors.
- [x] Deleted the post-repair disposable user and stopped the local server listener on port `3374`.
- [x] Checked `tibia-services\.env.local` and `.env.local.example` by key shape only; both still have placeholder-shaped `RESEND_API_KEY` values.
- [x] Added central report `TIBIA_SERVICES_COOKIE_FIX_AND_AUTH_RECHECK_20260510.md`.

## 2026-05-10 Resend Key Search

- [x] Ran a path-only Resend configuration scan across the active recovered source tree and `Programas_funcionando` promoted copies.
- [x] Scan parsed 15 matching files and recorded 22 classification rows without printing secret values.
- [x] Scan found 0 candidate real Resend API keys in the active source tree or promoted copies.
- [x] Scan found placeholder/non-secret Resend values and configured sender values only.
- [x] Confirmed `D:\Programas_Codex_Restored_20260504_200238` was not present in this session, so it was not searched.
- [x] No Resend API call or email send was attempted.
- [x] Added central report `TIBIA_SERVICES_RESEND_KEY_SEARCH_20260510.md`.

## 2026-05-10 Resend Smoke Script

- [x] Added `scripts\resend-smoke.mjs` as a controlled Resend provider/key/sender smoke command.
- [x] Added `npm run test:resend` to `package.json`.
- [x] The smoke script loads `.env.local` without printing values, rejects missing/placeholder-shaped Resend keys, requires `--to` or `RESEND_TEST_TO`, and sends only one controlled smoke email when not in dry-run mode.
- [x] Ran `node --check scripts\resend-smoke.mjs`; exit code `0`.
- [x] Ran `npm.cmd run test:resend -- --to codex-audit@example.com --dry-run`; command exited `1` as expected because the current key is missing or placeholder-shaped.
- [x] No Resend API call or email send was performed.
- [x] Ran post-change `npm.cmd run quality`; command exited `0`.
- [x] Post-change quality gate completed ESLint, TypeScript, Jest 8 suites / 63 tests, Next build, and npm audit with 0 vulnerabilities.
- [x] Added central report `TIBIA_SERVICES_RESEND_SMOKE_SCRIPT_20260510.md`.

## 2026-05-10 Resend Provider Smoke

- [x] David copied a Resend API key to the local clipboard and instructed Codex to use it.
- [x] Codex read the key from the local clipboard, validated only its Resend-looking shape, and wrote it to ignored `.env.local`; the key value was not printed.
- [x] Set `RESEND_FROM_EMAIL` to `onboarding@resend.dev` in `.env.local`.
- [x] Confirmed `.env.local` is ignored by Git.
- [x] Ran `npm.cmd run test:resend -- --to adftbd@gmail.com`; command exited `0`.
- [x] Resend smoke reported sent message id `366224ff-a03c-4009-ae70-cc6f73505aed`.
- [x] Ran post-smoke `npm.cmd run quality`; command exited `0`.
- [x] Post-smoke quality gate completed ESLint, TypeScript, Jest 8 suites / 63 tests, Next build, and npm audit with 0 vulnerabilities.
- [x] Added central report `TIBIA_SERVICES_RESEND_PROVIDER_SMOKE_20260510.md`.

## 2026-05-10 Booking Email Flow

- [x] David approved a bounded app-triggered booking email test.
- [x] Found and repaired a real email-observability bug: `src\lib\email.ts` now checks Resend `{ error }` returns and logs successful message ids without printing secrets.
- [x] Ran post-repair `npm.cmd run quality`; command exited `0`.
- [x] First `POST /api/bookings` app-route attempt returned HTTP `201` and cleaned up its disposable customer, serviceiro, booking, and rate-limit row.
- [x] The first attempt correctly logged a Resend failure because Resend test mode only allows sending to `adftbd@gmail.com`, not a Gmail plus-alias.
- [x] Confirmed the existing `adftbd@gmail.com` Supabase profile is a usable `customer`; Codex did not overwrite or delete that account.
- [x] Created one disposable serviceiro, one temporary booking to the existing customer, and signed in as the disposable serviceiro.
- [x] Called the real `PATCH /api/bookings/[id]` app route with `{ "action": "accept" }`; route returned HTTP `200`.
- [x] App logged `sendBookingAccepted` success with Resend message id `a0bc1fa8-d2f3-462b-9827-34b3f10b5ce0`.
- [x] Deleted the temporary booking, temporary notification, and disposable serviceiro user.
- [x] Stopped the local dev server and confirmed no listener remained on port `3375`.
- [x] Added central report `TIBIA_SERVICES_BOOKING_EMAIL_FLOW_20260510.md`.

## 2026-05-10 Promotion

- [x] David approved continuing after the Resend key/provider smoke and bounded app-triggered booking email flow.
- [x] Ran copy-only promotion with `Promote-VerifiedProject.ps1`.
- [x] Promoted copy created at `C:\Users\David\OneDrive\Desktop\Programas_funcionando\tibia-services`.
- [x] Promotion manifest row exists in `C:\Users\David\OneDrive\Desktop\Programas_funcionando\_workspace\registry\PROMOTION_MANIFEST.csv`.
- [x] Promotion manifest row records Git head `55e0a3f` and Git status short count `19`.
- [x] Verified promoted copy includes `CODEX_RECOVERY_CHECKLIST.md`, `PROJECT_FUNCTIONALITY.md`, `scripts\resend-smoke.mjs`, `src\lib\email.ts`, `package.json`, `package-lock.json`, and `.env.local.example`.
- [x] Verified promoted copy excludes `.env`, `.env.local`, `.git`, `.next`, `.open-next`, `.vercel`, `.swc`, `node_modules`, `next-env.d.ts`, and `tsconfig.tsbuildinfo`.
- [x] Found `supabase\.temp` in the promoted copy as local Supabase CLI state, then removed it from the promoted copy after verifying the resolved target path was inside the promoted `tibia-services` directory.
- [x] Added central report `TIBIA_SERVICES_PROMOTION_20260510.md`.

## Not Claimed

- [ ] Full manual feature review.
- [ ] Security review.
- [ ] Production deployment validation.
- [ ] Live Supabase app workflow beyond read-only table reachability.
- [ ] Signup UI flow; the disposable user was created through Supabase admin API to avoid email-confirmation dependency.
- [ ] `POST /api/bookings` booking-created email delivery to arbitrary serviceiro recipients before a Resend sending domain is verified; the route returned `201`, but Resend test mode rejected the disposable plus-alias recipient.
- [ ] Service request submission, messages, disputes, featured listings, verification requests, admin mutations, or production seed behavior.

## Source Reports

- `PROJECT_AUDIT.md`
- `VERIFICATION_RESULTS.md`
- `SOURCE_INTEGRITY.md`
- `RECOVERY_PROGRESS.md`
