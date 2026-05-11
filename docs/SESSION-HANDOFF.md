# Session Handoff - 2026-05-11

## What was done

- Reconciled the GitHub canonical source with the promoted snapshot for a conservative maintenance pass.
- Updated the server Supabase SSR client for the current async Next.js cookie API:
  - `src/lib/supabase/server.ts` now awaits `cookies()` and uses `getAll`/`setAll`.
  - Server Components and helpers that use the server client now await `createClient()`.
  - `getAuthUser()` and rate-limit helper types match the async server client.
- Kept the promoted snapshot's email helper refactor that centralizes Resend send result handling, without adding any new email-send script or running Resend.
- Ran a non-force `npm audit fix`; the lockfile now resolves Next.js to `15.5.18` within the existing `^15.5.15` range and resolves `fast-xml-builder` to `1.2.0`.
- Updated `docs/FLIGHT-RECORDER.md` and `docs/RETRO.md` with this maintenance pass.

## Verification

- `npm ci`: PASS.
- `npm run quality`: PASS with dummy non-secret env values:
  - `npm run lint`: PASS.
  - `npm run typecheck`: PASS.
  - `npm test -- --runInBand`: PASS, 8 test suites and 63 tests.
  - `npm run build`: PASS on Next.js `15.5.18`.
  - `npm run audit -- --audit-level=moderate`: PASS, 0 vulnerabilities.
- `git diff --check`: PASS; Git emitted LF-to-CRLF normalization warnings only.

## Boundaries

- No production deployment.
- No Supabase SQL, seed, RLS change, service-role probe, or live data mutation.
- No Resend send.
- No external API scan.
- Build verification used dummy non-secret environment values only.
- Generated artifacts (`node_modules`, `.next`, `.swc`, `next-env.d.ts`, `tsconfig.tsbuildinfo`) were removed after verification.

## What is next

1. Apply and verify the canonical database state manually before any production deployment: `supabase/schema.sql`, then migrations `001` through `009` in order.
2. Run owner-approved hosted smoke checks only after deployment and with explicit live-service boundaries.
3. Run any Resend smoke manually only after selecting a real sender and recipient.

---

# Session Handoff - 2026-05-02

## What was done

- Continued the uncommitted Full Mode hardening batch for the Tibia Services marketplace.
- Fixed the GitHub Actions Quality run failure on `master` after commit `3ab5a91`: Jest could not parse `jest.config.ts` in a clean `npm ci` environment because `ts-node` was not installed.
- Converted Jest config to `jest.config.js`, added it to the lint target, and upgraded the workflow to Node 24-compatible `actions/checkout@v6` and `actions/setup-node@v6`.
- Completed follow-up review fixes before commit:
  - Strengthened `supabase/migrations/009-contract-hardening.sql` so public booking updates now enforce service type/created-at immutability, final-state immutability, monotonic confirmation flags, active-only price changes, completed-state invariants, and no unrelated field changes during status transitions.
  - Replaced action rate limiting's route-level count/insert with the atomic `check_api_action_rate_limit()` RPC and changed `checkActionRateLimit()` to fail closed on persistence errors.
  - Required `content-length` on identity verification multipart uploads before parsing form data.
  - Revalidated service-request customer eligibility before the service-role booking insert in `/api/service-requests/[id]/apply`.
  - Kept dispute creation customer-only in both the API and booking UI.
  - Passed the server locale into `LanguageProvider` so initial SSR text and `<html lang>` stay aligned.
  - Made star rating fallback aria labels language-neutral.
  - Added CI-safe build env values to `.github/workflows/quality.yml`.
  - Added `npm run package` for repeatable OpenNext/Cloudflare packaging.
  - Ignored `.next` and `.open-next` in Jest so package artifacts do not cause haste-map collisions.
- Expanded regression tests:
  - `src/__tests__/migration-contracts.test.ts` now asserts the booking trigger and atomic rate-limit RPC invariants.
  - `src/__tests__/api-helpers.test.ts` now covers upload size/content-length handling and fail-closed action rate limiting.
- Updated docs and notes:
  - `docs/FLIGHT-RECORDER.md`, `docs/RETRO.md`, `docs/MIGRATION-STEPS.md`, `docs/tech-notes.md`, `docs/design-decisions.md`, `docs/developer-guide.md`, `docs/version-history.md`, `docs/build-commands.md`, `docs/DEPLOY-CHECKLIST.md`, `CONTRIBUTING.md`, `CLAUDE.md`, and `NEXT-STEPS.md`.

Main commit: `f51cfec` (`feat(security): harden marketplace contracts`).
CI fix commit: `0846c22` (`fix(ci): remove implicit Jest ts-node dependency`).

## What's in progress

Nothing is intentionally left in progress.

## What's next

1. Run `supabase/schema.sql`, then migrations `001` through `009` in order on the target Supabase project before production deployment.
2. Bootstrap the first production admin only after email confirmation, using the verified `auth.users.id`.
3. Live smoke-test production flows after migration/deploy: registration, booking, dispute open/resolve, review insert, featured listing activation, verification upload, notification bell, and email delivery.
4. Optional next polish: generated Supabase `Database` types and server-side pagination/filtering for public list pages.

## Current state

- `npm run quality`: PASS.
- Clean `npm ci` followed by `npm run quality`: PASS.
- `npm run lint`: PASS with zero warnings.
- `npm run typecheck`: PASS.
- `npm test -- --runInBand`: PASS, 63 tests across 8 suites.
- `npm run build`: PASS.
- GitHub Actions build env simulation with dummy CI env vars: PASS.
- `npm run audit`: PASS, zero vulnerabilities.
- `npm run package`: PASS; generated `.open-next/worker.js`. OpenNext warns that Windows is not its preferred runtime, so use WSL/Linux if a Cloudflare runtime issue appears.
- `git diff --check`: PASS; Git reports LF-to-CRLF normalization warnings only.

## Decisions made

- Booking lifecycle invariants belong in the database trigger, including final-state immutability and monotonic participant confirmations.
- Service-role writes that act for another user must explicitly re-check the actor eligibility that public RLS would have enforced.
- Abuse-control rate limits must be atomic at the persistence boundary and fail closed on DB/RPC errors.
- `npm run package` is the local Cloudflare Workers artifact build; `npm run quality` remains the local and CI pre-deploy quality gate.
